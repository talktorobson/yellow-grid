import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateConversationDto,
  AddParticipantDto,
  SendMessageDto,
  UpdateMessageDto,
  MarkAsReadDto,
  ListMessagesQueryDto,
  ListConversationsQueryDto,
} from './dto/chat.dto';
import { ConversationStatus, MessageStatus, MessageType, ParticipantType } from '@prisma/client';

/**
 * Service for managing chat conversations and messages.
 *
 * Key features:
 * - 4-party conversations: Customer, Operator, WorkTeam, Provider Manager
 * - All conversations are scoped to a ServiceOrder
 * - Real-time messaging with read receipts
 * - Attachment support (images, documents, voice notes)
 */
@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create a conversation for a service order.
   * Each service order has exactly one conversation.
   */
  async getOrCreateConversation(
    serviceOrderId: string,
    userId: string,
    userContext: {
      workTeamId?: string;
      providerId?: string;
      participantType: ParticipantType;
      displayName: string;
    },
  ) {
    // Verify service order exists
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        conversation: {
          include: {
            participants: true,
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Service order not found');
    }

    // If conversation exists, ensure user is a participant
    if (serviceOrder.conversation) {
      const existingParticipant = serviceOrder.conversation.participants.find(
        (p) => p.userId === userId,
      );

      if (!existingParticipant) {
        // Add user as participant
        await this.addParticipant(serviceOrder.conversation.id, {
          userId,
          participantType: userContext.participantType,
          displayName: userContext.displayName,
          workTeamId: userContext.workTeamId,
          providerId: userContext.providerId,
        });
      }

      return this.prisma.serviceOrderConversation.findUnique({
        where: { id: serviceOrder.conversation.id },
        include: {
          participants: true,
          messages: {
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: {
              participant: true,
              replyTo: {
                include: { participant: true },
              },
            },
          },
        },
      });
    }

    // Create new conversation
    const conversation = await this.prisma.serviceOrderConversation.create({
      data: {
        serviceOrderId,
        countryCode: serviceOrder.countryCode,
        businessUnit: serviceOrder.businessUnit,
        status: ConversationStatus.ACTIVE,
        participantIds: [userId],
        participants: {
          create: {
            userId,
            participantType: userContext.participantType,
            displayName: userContext.displayName,
            workTeamId: userContext.workTeamId,
            providerId: userContext.providerId,
            isActive: true,
          },
        },
      },
      include: {
        participants: true,
        messages: true,
      },
    });

    return conversation;
  }

  /**
   * Add a participant to a conversation
   */
  async addParticipant(conversationId: string, dto: AddParticipantDto) {
    const conversation = await this.prisma.serviceOrderConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if participant already exists
    const existingParticipant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        OR: [{ userId: dto.userId }, { customerEmail: dto.customerEmail }],
      },
    });

    if (existingParticipant) {
      // Reactivate if previously left
      if (!existingParticipant.isActive) {
        return this.prisma.conversationParticipant.update({
          where: { id: existingParticipant.id },
          data: {
            isActive: true,
            leftAt: null,
            joinedAt: new Date(),
          },
        });
      }
      return existingParticipant;
    }

    // Create new participant
    const participant = await this.prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId: dto.userId,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        participantType: dto.participantType,
        displayName: dto.displayName,
        workTeamId: dto.workTeamId,
        providerId: dto.providerId,
        isActive: true,
      },
    });

    // Update participantIds in conversation
    const currentIds = (conversation.participantIds as string[]) || [];
    if (dto.userId && !currentIds.includes(dto.userId)) {
      await this.prisma.serviceOrderConversation.update({
        where: { id: conversationId },
        data: {
          participantIds: [...currentIds, dto.userId],
        },
      });
    }

    return participant;
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId: string, userId: string, dto: SendMessageDto) {
    // Find participant
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true,
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Validate reply-to if provided
    if (dto.replyToMessageId) {
      const replyToMessage = await this.prisma.serviceOrderMessage.findUnique({
        where: { id: dto.replyToMessageId },
      });
      if (!replyToMessage || replyToMessage.conversationId !== conversationId) {
        throw new BadRequestException('Invalid reply-to message');
      }
    }

    // Create message
    const message = await this.prisma.serviceOrderMessage.create({
      data: {
        conversationId,
        participantId: participant.id,
        messageType: dto.messageType || MessageType.TEXT,
        content: dto.content,
        attachments: dto.attachments as any,
        replyToMessageId: dto.replyToMessageId,
        status: MessageStatus.SENT,
      },
      include: {
        participant: true,
        replyTo: {
          include: { participant: true },
        },
      },
    });

    // Update conversation with last message info
    await this.prisma.serviceOrderConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.createdAt,
        lastMessagePreview: dto.content.substring(0, 200),
      },
    });

    // Increment unread counts for other participants
    const conversation = await this.prisma.serviceOrderConversation.findUnique({
      where: { id: conversationId },
    });

    if (conversation) {
      const unreadCounts = (conversation.unreadCounts as Record<string, number>) || {};
      const participantIds = (conversation.participantIds as string[]) || [];

      participantIds.forEach((pid) => {
        if (pid !== userId) {
          unreadCounts[pid] = (unreadCounts[pid] || 0) + 1;
        }
      });

      await this.prisma.serviceOrderConversation.update({
        where: { id: conversationId },
        data: { unreadCounts },
      });
    }

    return message;
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(conversationId: string, userId: string, query: ListMessagesQueryDto) {
    // Verify participant
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const take = query.take || 50;
    const sortOrder = query.sortOrder || 'desc';

    const whereClause: any = {
      conversationId,
      isDeleted: false,
    };

    if (query.cursor) {
      whereClause.id = sortOrder === 'desc' ? { lt: query.cursor } : { gt: query.cursor };
    }

    const messages = await this.prisma.serviceOrderMessage.findMany({
      where: whereClause,
      take,
      orderBy: { createdAt: sortOrder },
      include: {
        participant: true,
        replyTo: {
          include: { participant: true },
        },
      },
    });

    const total = await this.prisma.serviceOrderMessage.count({
      where: { conversationId, isDeleted: false },
    });

    return {
      data: messages,
      meta: {
        total,
        hasMore: messages.length === take,
        cursor: messages.length > 0 ? messages[messages.length - 1].id : null,
      },
    };
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string, dto: MarkAsReadDto) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Update participant's last read info
    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        lastReadAt: new Date(),
        lastReadMessageId: dto.lastReadMessageId,
      },
    });

    // Reset unread count for this user
    const conversation = await this.prisma.serviceOrderConversation.findUnique({
      where: { id: conversationId },
    });

    if (conversation) {
      const unreadCounts = (conversation.unreadCounts as Record<string, number>) || {};
      unreadCounts[userId] = 0;

      await this.prisma.serviceOrderConversation.update({
        where: { id: conversationId },
        data: { unreadCounts },
      });
    }

    return { success: true };
  }

  /**
   * Get conversations for a user
   */
  async getConversations(userId: string, query: ListConversationsQueryDto) {
    const take = query.take || 20;
    const skip = query.skip || 0;

    const whereClause: any = {
      participants: {
        some: {
          userId,
          isActive: true,
        },
      },
    };

    if (query.serviceOrderId) {
      whereClause.serviceOrderId = query.serviceOrderId;
    }

    const conversations = await this.prisma.serviceOrderConversation.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        serviceOrder: {
          select: {
            id: true,
            externalServiceOrderId: true,
            serviceType: true,
            state: true,
            customerInfo: true,
            serviceAddress: true,
          },
        },
        participants: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { participant: true },
        },
      },
    });

    // Calculate unread counts for this user
    const conversationsWithUnread = conversations.map((conv) => {
      const unreadCounts = (conv.unreadCounts as Record<string, number>) || {};
      return {
        ...conv,
        unreadCount: unreadCounts[userId] || 0,
      };
    });

    // Filter by unread if requested
    const result = query.unreadOnly
      ? conversationsWithUnread.filter((c) => c.unreadCount > 0)
      : conversationsWithUnread;

    const total = await this.prisma.serviceOrderConversation.count({
      where: whereClause,
    });

    return {
      data: result,
      meta: {
        total,
        skip,
        take,
      },
    };
  }

  /**
   * Get a single conversation by ID
   */
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.serviceOrderConversation.findUnique({
      where: { id: conversationId },
      include: {
        serviceOrder: {
          select: {
            id: true,
            externalServiceOrderId: true,
            serviceType: true,
            state: true,
            customerInfo: true,
            serviceAddress: true,
            assignedWorkTeamId: true,
            assignedProviderId: true,
          },
        },
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify user is participant
    const isParticipant = conversation.participants.some((p) => p.userId === userId);

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const unreadCounts = (conversation.unreadCounts as Record<string, number>) || {};

    return {
      ...conversation,
      unreadCount: unreadCounts[userId] || 0,
    };
  }

  /**
   * Get conversation by service order ID
   */
  async getConversationByServiceOrder(serviceOrderId: string, userId: string) {
    const conversation = await this.prisma.serviceOrderConversation.findUnique({
      where: { serviceOrderId },
      include: {
        serviceOrder: {
          select: {
            id: true,
            externalServiceOrderId: true,
            serviceType: true,
            state: true,
            customerInfo: true,
            serviceAddress: true,
          },
        },
        participants: true,
        messages: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            participant: true,
            replyTo: {
              include: { participant: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return null;
    }

    // Verify user is participant
    const isParticipant = conversation.participants.some((p) => p.userId === userId);

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const unreadCounts = (conversation.unreadCounts as Record<string, number>) || {};

    return {
      ...conversation,
      unreadCount: unreadCounts[userId] || 0,
    };
  }

  /**
   * Update a message (edit)
   */
  async updateMessage(messageId: string, userId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.serviceOrderMessage.findUnique({
      where: { id: messageId },
      include: { participant: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.participant.userId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Store original content if first edit
    const originalContent = message.isEdited ? message.originalContent : message.content;

    return this.prisma.serviceOrderMessage.update({
      where: { id: messageId },
      data: {
        content: dto.content,
        isEdited: true,
        editedAt: new Date(),
        originalContent,
      },
      include: {
        participant: true,
        replyTo: {
          include: { participant: true },
        },
      },
    });
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.serviceOrderMessage.findUnique({
      where: { id: messageId },
      include: { participant: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.participant.userId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    return this.prisma.serviceOrderMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });
  }

  /**
   * Get unread message count for a user across all conversations
   */
  async getUnreadCount(userId: string) {
    const conversations = await this.prisma.serviceOrderConversation.findMany({
      where: {
        participants: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      select: {
        unreadCounts: true,
      },
    });

    const totalUnread = conversations.reduce((sum, conv) => {
      const counts = (conv.unreadCounts as Record<string, number>) || {};
      return sum + (counts[userId] || 0);
    }, 0);

    return { unreadCount: totalUnread };
  }
}
