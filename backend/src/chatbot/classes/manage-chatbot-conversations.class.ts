import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { ChatbotMessage } from '../interfaces/chatbot-conversation.interface';
import { ChatbotInputPrompt } from '../interfaces/chatbot-flow.interface';

export interface ChatbotConversationResponse {
  id: string;
  flowId: string;
  state: string;
  completed: boolean;
  input: ChatbotInputPrompt | null;
  responses: string[];
  history: ChatbotMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export abstract class ManageChatbotConversationsUseCase {
  abstract startConversation(user: AuthenticatedUserDto, flowId?: string): Promise<ChatbotConversationResponse>;
  abstract processMessage(user: AuthenticatedUserDto, conversationId: string, message: string): Promise<ChatbotConversationResponse>;
  abstract getConversation(user: AuthenticatedUserDto, conversationId: string): Promise<ChatbotConversationResponse>;
  abstract resetConversation(user: AuthenticatedUserDto, conversationId: string): Promise<ChatbotConversationResponse>;
}
