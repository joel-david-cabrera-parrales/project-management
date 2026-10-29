import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { SendChatbotMessageDto } from './dto/send-chatbot-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';
import { ChatbotService } from './chatbot.service';

@ApiTags('Chatbot')
@ApiBearerAuth()
@Controller('chatbot')
@UseGuards(AuthGuard('jwt'))
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('flows')
  @ApiOperation({ summary: 'List available assistant flows' })
  getFlows() {
    return this.chatbotService.getFlows();
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start an authenticated user conversation' })
  startConversation(@GetUser() user: AuthenticatedUserDto, @Body() dto: StartConversationDto) {
    return this.chatbotService.startConversation(user, dto.flowId);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get one of the current user conversations' })
  getConversation(
    @GetUser() user: AuthenticatedUserDto,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.chatbotService.getConversation(user, conversationId);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message to the task assistant' })
  sendMessage(
    @GetUser() user: AuthenticatedUserDto,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendChatbotMessageDto,
  ) {
    return this.chatbotService.processMessage(user, conversationId, dto.message);
  }

  @Post('conversations/:conversationId/reset')
  @ApiOperation({ summary: 'Reset a current user conversation' })
  resetConversation(
    @GetUser() user: AuthenticatedUserDto,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.chatbotService.resetConversation(user, conversationId);
  }
}
