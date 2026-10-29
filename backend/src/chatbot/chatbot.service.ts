import { Injectable } from '@nestjs/common';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { ManageChatbotConversationsUseCase } from './classes/manage-chatbot-conversations.class';
import type { ChatbotFlow } from './interfaces/chatbot-flow.interface';
import { TASK_ASSISTANT_FLOW } from './flows/task-assistant.flow';

@Injectable()
export class ChatbotService {
  constructor(private readonly conversations: ManageChatbotConversationsUseCase) {}

  getFlows(): Array<Pick<ChatbotFlow, 'id' | 'name'>> {
    return [{ id: TASK_ASSISTANT_FLOW.id, name: TASK_ASSISTANT_FLOW.name }];
  }

  startConversation(user: AuthenticatedUserDto, flowId?: string) {
    return this.conversations.startConversation(user, flowId);
  }

  processMessage(user: AuthenticatedUserDto, conversationId: string, message: string) {
    return this.conversations.processMessage(user, conversationId, message);
  }

  getConversation(user: AuthenticatedUserDto, conversationId: string) {
    return this.conversations.getConversation(user, conversationId);
  }

  resetConversation(user: AuthenticatedUserDto, conversationId: string) {
    return this.conversations.resetConversation(user, conversationId);
  }
}
