import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  AddParticipantDto,
  SendMessageDto,
  UpdateMessageDto,
  MarkAsReadDto,
  ListMessagesQueryDto,
  ListConversationsQueryDto,
} from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParticipantType } from '@prisma/client';

/**
 * Chat Controller
 *
 * Endpoints for managing service order conversations.
 * All participants (Customer, Operator, WorkTeam, Provider Manager)
 * can communicate in a shared conversation context.
 */
@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get or create conversation for a service order
   */
  @Post('service-orders/:serviceOrderId/conversation')
  @ApiOperation({ summary: 'Get or create conversation for a service order' })
  @ApiParam({ name: 'serviceOrderId', description: 'Service order ID' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved or created' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async getOrCreateConversation(
    @Param('serviceOrderId') serviceOrderId: string,
    @Request() req: any,
  ) {
    const user = req.user;

    // Determine participant type based on user context
    let participantType: ParticipantType;
    if (user.workTeamId) {
      participantType = ParticipantType.WORK_TEAM;
    } else if (user.providerId) {
      participantType = ParticipantType.PROVIDER_MANAGER;
    } else {
      participantType = ParticipantType.OPERATOR;
    }

    return this.chatService.getOrCreateConversation(serviceOrderId, user.userId, {
      workTeamId: user.workTeamId,
      providerId: user.providerId,
      participantType,
      displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    });
  }

  /**
   * Get conversation by service order ID
   */
  @Get('service-orders/:serviceOrderId/conversation')
  @ApiOperation({ summary: 'Get conversation for a service order' })
  @ApiParam({ name: 'serviceOrderId', description: 'Service order ID' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversationByServiceOrder(
    @Param('serviceOrderId') serviceOrderId: string,
    @Request() req: any,
  ) {
    return this.chatService.getConversationByServiceOrder(serviceOrderId, req.user.userId);
  }

  /**
   * List conversations for current user
   */
  @Get('conversations')
  @ApiOperation({ summary: 'List conversations for current user' })
  @ApiQuery({ name: 'serviceOrderId', required: false, description: 'Filter by service order' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(@Query() query: ListConversationsQueryDto, @Request() req: any) {
    return this.chatService.getConversations(req.user.userId, query);
  }

  /**
   * Get conversation details
   */
  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(@Param('id') id: string, @Request() req: any) {
    return this.chatService.getConversation(id, req.user.userId);
  }

  /**
   * Add participant to conversation
   */
  @Post('conversations/:id/participants')
  @ApiOperation({ summary: 'Add a participant to the conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Participant added' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto) {
    return this.chatService.addParticipant(id, dto);
  }

  /**
   * Get messages in a conversation
   */
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, description: 'Pagination cursor (message ID)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @Param('id') id: string,
    @Query() query: ListMessagesQueryDto,
    @Request() req: any,
  ) {
    return this.chatService.getMessages(id, req.user.userId, query);
  }

  /**
   * Send a message
   */
  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  async sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto, @Request() req: any) {
    return this.chatService.sendMessage(id, req.user.userId, dto);
  }

  /**
   * Mark messages as read
   */
  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(@Param('id') id: string, @Body() dto: MarkAsReadDto, @Request() req: any) {
    return this.chatService.markAsRead(id, req.user.userId, dto);
  }

  /**
   * Update a message
   */
  @Patch('messages/:id')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message updated' })
  @ApiResponse({ status: 403, description: 'Can only edit own messages' })
  async updateMessage(@Param('id') id: string, @Body() dto: UpdateMessageDto, @Request() req: any) {
    return this.chatService.updateMessage(id, req.user.userId, dto);
  }

  /**
   * Delete a message
   */
  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 204, description: 'Message deleted' })
  @ApiResponse({ status: 403, description: 'Can only delete own messages' })
  async deleteMessage(@Param('id') id: string, @Request() req: any) {
    await this.chatService.deleteMessage(id, req.user.userId);
  }

  /**
   * Get total unread count
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Request() req: any) {
    return this.chatService.getUnreadCount(req.user.userId);
  }
}
