import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { ChatbotFlow, ChatbotUserData } from '../interfaces/chatbot-flow.interface';
import { ChatbotListItem, ChatbotTaskCard } from '../interfaces/chatbot-conversation.interface';
import { ChatbotActionExecutor } from '../classes/chatbot-action-executor.class';

export interface ChatbotTransitionResult {
  state: string;
  responses: string[];
  completed: boolean;
  success: boolean;
  taskCards?: ChatbotTaskCard[];
  listItems?: ChatbotListItem[];
}

@Injectable()
export class StateMachineService {
  constructor(private readonly actions: ChatbotActionExecutor) {}

  start(flow: ChatbotFlow, userData: ChatbotUserData): ChatbotTransitionResult {
    const initialState = flow.states[flow.initialState];
    if (!initialState) throw new BadRequestException(`El flujo ${flow.id} no tiene un estado inicial válido.`);
    return {
      state: flow.initialState,
      responses: this.render(initialState.message, userData),
      completed: initialState.terminal === true,
      success: true,
    };
  }

  async transition(
    flow: ChatbotFlow,
    currentState: string,
    input: string,
    userData: ChatbotUserData,
    user: AuthenticatedUserDto,
  ): Promise<ChatbotTransitionResult> {
    const state = flow.states[currentState];
    if (!state) return this.failure(currentState, 'Perdona, perdí el hilo de la conversación. Reiníciala e intentamos de nuevo.');

    const trimmedInput = input.trim();
    if (state.input?.required && !trimmedInput) return this.failure(currentState, 'Ese dato es necesario para continuar 😊');

    const transition = this.selectTransition(state, trimmedInput);
    if (!transition) {
      const response = state.input?.type === 'choice'
        ? `No reconocí esa opción 😅 Elige una de estas: ${state.input.options?.join(', ')}.`
        : state.input?.type === 'confirmation'
          ? 'Respóndeme “Sí” para confirmar o “No” para cancelar, por favor 😊'
          : 'No pude procesar esa respuesta. Inténtalo otra vez, por favor 🙏';
      return this.failure(currentState, response);
    }

    const nextState = flow.states[transition.target];
    if (!nextState) return this.failure(currentState, 'Esta opción todavía no está disponible.');

    if (transition.event === 'RESTART') Object.keys(userData).forEach((key) => delete userData[key]);
    else if (state.input?.saveAs && trimmedInput) userData[state.input.saveAs] = trimmedInput;

    if (transition.action) {
      try {
        Object.assign(userData, await this.actions.execute(transition.action, user, userData));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No pude completar esa acción.';
        return this.failure(currentState, `Uy 😅 ${message}`);
      }
    }

    const cardsValue = nextState.taskCardsFrom ? userData[nextState.taskCardsFrom] : undefined;
    const taskCards = Array.isArray(cardsValue) ? cardsValue as ChatbotTaskCard[] : undefined;
    if (nextState.taskCardsFrom) delete userData[nextState.taskCardsFrom];
    const itemsValue = nextState.listItemsFrom ? userData[nextState.listItemsFrom] : undefined;
    const listItems = Array.isArray(itemsValue) ? itemsValue as ChatbotListItem[] : undefined;
    if (nextState.listItemsFrom) delete userData[nextState.listItemsFrom];

    return {
      state: transition.target,
      responses: this.render(nextState.message, userData),
      completed: nextState.terminal === true,
      success: true,
      ...(taskCards?.length ? { taskCards } : {}),
      ...(listItems?.length ? { listItems } : {}),
    };
  }

  private selectTransition(state: ChatbotFlow['states'][string], input: string) {
    const transitions = state.transitions ?? [];
    const normalized = input.toLocaleLowerCase();
    if (state.input?.type === 'choice') {
      return transitions.find((transition) =>
        transition.event === 'SELECT' && transition.value?.toLocaleLowerCase() === normalized,
      );
    }
    if (state.input?.type === 'confirmation') {
      const affirmative = /^(si|sí|yes|claro|confirmo|correcto|listo)(?:$|[\s.!])/i.test(normalized);
      if (affirmative) return transitions.find((transition) => transition.event === 'CONFIRM');
      const negative = /^(no|cancelar|cancelo|mejor no)(?:$|[\s.!])/i.test(normalized);
      if (!negative) return undefined;
      return transitions.find((transition) => transition.event === 'CANCEL')
        ?? transitions.find((transition) => transition.event === 'RESTART');
    }
    return transitions.find((transition) => transition.event === 'VALID');
  }

  private failure(state: string, response: string): ChatbotTransitionResult {
    return { state, responses: [response], completed: false, success: false };
  }

  private render(template: string | string[], data: ChatbotUserData): string[] {
    return (Array.isArray(template) ? template : [template]).map((message) =>
      message.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key: string) => {
        const value = data[key];
        return value === undefined || value === null ? '' : String(value);
      }),
    );
  }
}
