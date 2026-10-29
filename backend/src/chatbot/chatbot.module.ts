import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { CommentModule } from 'src/comment/comment.module';
import { TaskModule } from 'src/task/task.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotConversation } from './entities/chatbot-conversation.entity';
import { StateMachineService } from './core/state-machine.service';
import { TaskChatbotActionsService } from './core/task-chatbot-actions.service';
import { ChatbotActionExecutor } from './classes/chatbot-action-executor.class';
import { ManageChatbotConversationsUseCase } from './classes/manage-chatbot-conversations.class';
import { ManageChatbotConversationsUseCaseImp } from './use-cases/manage-chatbot-conversations.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatbotConversation]),
    AuthModule,
    WorkspaceModule,
    TaskModule,
    CommentModule,
  ],
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    StateMachineService,
    TaskChatbotActionsService,
    { provide: ChatbotActionExecutor, useExisting: TaskChatbotActionsService },
    { provide: ManageChatbotConversationsUseCase, useClass: ManageChatbotConversationsUseCaseImp },
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}
