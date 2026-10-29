import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { ChatbotUserData } from '../interfaces/chatbot-flow.interface';

export abstract class ChatbotActionExecutor {
  abstract execute(action: string, user: AuthenticatedUserDto, data: ChatbotUserData): Promise<ChatbotUserData>;
}
