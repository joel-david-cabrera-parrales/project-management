import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { ChatbotConversation } from '../entities/chatbot-conversation.entity';
import { ChatbotMessage } from '../interfaces/chatbot-conversation.interface';
import { ChatbotFlow } from '../interfaces/chatbot-flow.interface';
import { TASK_ASSISTANT_FLOW } from '../flows/task-assistant.flow';
import { StateMachineService } from '../core/state-machine.service';
import { ChatbotConversationResponse, ManageChatbotConversationsUseCase } from '../classes/manage-chatbot-conversations.class';

const FLOWS: ChatbotFlow[] = [TASK_ASSISTANT_FLOW];
const MAX_HISTORY_MESSAGES = 200;

@Injectable()
export class ManageChatbotConversationsUseCaseImp extends ManageChatbotConversationsUseCase {
  constructor(
    @InjectRepository(ChatbotConversation)
    private readonly conversationRepository: Repository<ChatbotConversation>,
    private readonly stateMachine: StateMachineService,
  ) {
    super();
  }

  async startConversation(user: AuthenticatedUserDto, flowId = TASK_ASSISTANT_FLOW.id): Promise<ChatbotConversationResponse> {
    const flow = this.findFlow(flowId);
    const userData = {};
    const result = this.stateMachine.start(flow, userData);
    const now = new Date().toISOString();
    const conversation = await this.conversationRepository.save(this.conversationRepository.create({
      userId: user.id,
      flowId: flow.id,
      currentState: result.state,
      userData,
      history: this.toAssistantMessages(result.responses, now),
      completed: result.completed,
    }));
    return this.toConversationResponse(conversation, result.responses);
  }

  async processMessage(user: AuthenticatedUserDto, conversationId: string, message: string): Promise<ChatbotConversationResponse> {
    const conversation = await this.findConversation(user.id, conversationId);
    if (conversation.completed) {
      throw new ConflictException('Esta conversación ya terminó. Inicia una nueva para continuar 😊');
    }

    const flow = this.findFlow(conversation.flowId);
    const normalizedMessage = message.trim();
    const now = new Date().toISOString();
    const history = [...conversation.history, { sender: 'user' as const, content: normalizedMessage, timestamp: now }];
    const userData = { ...conversation.userData };
    const result = await this.stateMachine.transition(flow, conversation.currentState, normalizedMessage, userData, user);

    conversation.currentState = result.state;
    conversation.userData = userData;
    conversation.completed = result.completed;
    conversation.history = [...history, ...this.toAssistantMessages(result.responses, new Date().toISOString())]
      .slice(-MAX_HISTORY_MESSAGES);

    const saved = await this.conversationRepository.save(conversation);
    return this.toConversationResponse(saved, result.responses);
  }

  async getConversation(user: AuthenticatedUserDto, conversationId: string): Promise<ChatbotConversationResponse> {
    const conversation = await this.findConversation(user.id, conversationId);
    return this.toConversationResponse(conversation, []);
  }

  async resetConversation(user: AuthenticatedUserDto, conversationId: string): Promise<ChatbotConversationResponse> {
    const conversation = await this.findConversation(user.id, conversationId);
    const flow = this.findFlow(conversation.flowId);
    const userData = {};
    const result = this.stateMachine.start(flow, userData);
    conversation.currentState = result.state;
    conversation.userData = userData;
    conversation.completed = result.completed;
    conversation.history = this.toAssistantMessages(result.responses, new Date().toISOString());
    const saved = await this.conversationRepository.save(conversation);
    return this.toConversationResponse(saved, result.responses);
  }

  private async findConversation(userId: number, conversationId: string): Promise<ChatbotConversation> {
    const conversation = await this.conversationRepository.findOneBy({ id: conversationId, userId });
    if (!conversation) throw new NotFoundException('No encontré esa conversación.');
    return conversation;
  }

  private findFlow(flowId: string): ChatbotFlow {
    const flow = FLOWS.find((candidate) => candidate.id === flowId);
    if (!flow) throw new NotFoundException(`No existe el flujo "${flowId}".`);
    return flow;
  }

  private toAssistantMessages(messages: string[], timestamp: string): ChatbotMessage[] {
    return messages.filter(Boolean).map((content) => ({ sender: 'assistant', content, timestamp }));
  }

  private toConversationResponse(conversation: ChatbotConversation, responses: string[]): ChatbotConversationResponse {
    return {
      id: conversation.id,
      flowId: conversation.flowId,
      state: conversation.currentState,
      completed: conversation.completed,
      responses,
      history: conversation.history,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}
