import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ExecutionStatus, CompletionStatus } from '../../common/types/schema.types';

export interface CreateExecutionDto {
  serviceOrderId: string;
  workTeamId: string;
  checklistItems?: Array<{
    id: string;
    label: string;
    required: boolean;
    completed?: boolean;
  }>;
}

export interface CheckInDto {
  lat?: number;
  lon?: number;
  notes?: string;
}

export interface CheckOutDto {
  lat?: number;
  lon?: number;
  notes?: string;
}

export interface UpdateChecklistDto {
  items: Array<{
    id: string;
    label: string;
    required: boolean;
    completed?: boolean;
  }>;
}

export interface CompleteChecklistItemDto {
  itemId: string;
  notes?: string;
}

export interface RecordCompletionDto {
  completionStatus: CompletionStatus;
  incompleteReason?: string;
  notes?: string;
}

export interface UploadPhotoDto {
  url: string;
  type: 'before' | 'after';
  caption?: string;
}

export interface UploadAudioNoteDto {
  url: string;
  duration: number; // seconds
  notes?: string;
}

export interface CustomerFeedbackDto {
  rating: number; // 1-5
  feedback?: string;
  signature?: string; // Base64 image
}

@Injectable()
export class ExecutionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all executions with filters
   */
  async findAll(filters?: {
    status?: ExecutionStatus;
    serviceOrderId?: string;
    workTeamId?: string;
    blocked?: boolean;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.serviceOrderId) {
      where.serviceOrderId = filters.serviceOrderId;
    }

    if (filters?.workTeamId) {
      where.workTeamId = filters.workTeamId;
    }

    if (filters?.blocked === true) {
      where.canCheckIn = false;
    }

    return this.prisma.execution.findMany({
      where,
      include: {
        serviceOrder: {
          include: {
            project: {
              select: {
                worksiteCity: true,
              },
            },
          },
        },
        workTeam: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                tier: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get execution by ID with full details
   */
  async findOne(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        serviceOrder: {
          include: {
            project: {
              include: {
                contacts: true,
              },
            },
          },
        },
        workTeam: {
          include: {
            provider: true,
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    return execution;
  }

  /**
   * Create a new execution
   */
  async create(data: CreateExecutionDto) {
    // Validate service order exists
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: data.serviceOrderId },
      include: {
        assignment: true,
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException(`Service Order ${data.serviceOrderId} not found`);
    }

    // Check if execution already exists
    const existingExecution = await this.prisma.execution.findUnique({
      where: { serviceOrderId: data.serviceOrderId },
    });

    if (existingExecution) {
      throw new BadRequestException('Execution already exists for this service order');
    }

    // Validate work team exists
    const workTeam = await this.prisma.workTeam.findUnique({
      where: { id: data.workTeamId },
    });

    if (!workTeam) {
      throw new NotFoundException(`Work Team ${data.workTeamId} not found`);
    }

    // Check Go Exec status - if NOK, block check-in
    const canCheckIn = serviceOrder.goExecStatus !== 'NOK';
    const blockedReason = serviceOrder.goExecStatus === 'NOK'
      ? serviceOrder.goExecBlockReason || 'Go Execution check failed (payment or delivery issue)'
      : null;

    const execution = await this.prisma.execution.create({
      data: {
        serviceOrderId: data.serviceOrderId,
        workTeamId: data.workTeamId,
        status: ExecutionStatus.PENDING,
        canCheckIn,
        blockedReason,
        checklistItems: data.checklistItems ? JSON.stringify(data.checklistItems) : null,
        checklistCompletion: 0,
      },
      include: {
        serviceOrder: true,
        workTeam: true,
      },
    });

    // TODO: Send notification to technician
    console.log(`📱 Execution ${execution.id} created for SO ${data.serviceOrderId}`);

    return execution;
  }

  // ==================== CHECK-IN / CHECK-OUT ====================

  /**
   * Check-in to execution (start work)
   */
  async checkIn(id: string, checkInData: CheckInDto) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        serviceOrder: true,
      },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    if (execution.status !== ExecutionStatus.PENDING) {
      throw new BadRequestException(`Execution must be PENDING to check-in. Current status: ${execution.status}`);
    }

    if (!execution.canCheckIn) {
      throw new BadRequestException(
        `Check-in is blocked: ${execution.blockedReason || 'Unknown reason'}`
      );
    }

    if (execution.checkInAt) {
      throw new BadRequestException('Already checked in');
    }

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        status: ExecutionStatus.IN_PROGRESS,
        checkInAt: new Date(),
        checkInLat: checkInData.lat,
        checkInLon: checkInData.lon,
        notes: checkInData.notes,
      },
    });

    // Update service order status
    await this.prisma.serviceOrder.update({
      where: { id: execution.serviceOrderId },
      data: {
        status: 'IN_PROGRESS',
      },
    });

    // TODO: Send real-time notification to operator
    // TODO: Log GPS coordinates for verification
    console.log(`🟢 Execution ${id} checked in at ${new Date()}`);

    return this.findOne(id);
  }

  /**
   * Check-out from execution (end work)
   */
  async checkOut(id: string, checkOutData: CheckOutDto) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    if (execution.status !== ExecutionStatus.IN_PROGRESS) {
      throw new BadRequestException(`Execution must be IN_PROGRESS to check-out. Current status: ${execution.status}`);
    }

    if (!execution.checkInAt) {
      throw new BadRequestException('Must check-in before check-out');
    }

    if (execution.checkOutAt) {
      throw new BadRequestException('Already checked out');
    }

    const checkOutTime = new Date();
    const actualHours = (checkOutTime.getTime() - execution.checkInAt.getTime()) / (1000 * 60 * 60);

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        status: ExecutionStatus.COMPLETED,
        checkOutAt: checkOutTime,
        checkOutLat: checkOutData.lat,
        checkOutLon: checkOutData.lon,
        actualHours,
        notes: execution.notes
          ? `${execution.notes}\n\nCheck-out: ${checkOutData.notes || ''}`
          : checkOutData.notes,
      },
    });

    // TODO: Trigger WCF generation
    // TODO: Send notification to customer for feedback
    // TODO: Calculate actual hours vs estimated for metrics
    console.log(`🔴 Execution ${id} checked out. Duration: ${actualHours.toFixed(2)}h`);

    return this.findOne(id);
  }

  // ==================== CHECKLIST MANAGEMENT ====================

  /**
   * Update checklist items
   */
  async updateChecklist(id: string, checklistData: UpdateChecklistDto) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        checklistItems: JSON.stringify(checklistData.items),
      },
    });

    return this.findOne(id);
  }

  /**
   * Complete a checklist item
   */
  async completeChecklistItem(id: string, itemData: CompleteChecklistItemDto) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    if (!execution.checklistItems) {
      throw new BadRequestException('No checklist items to complete');
    }

    const items = JSON.parse(execution.checklistItems as string);
    const itemIndex = items.findIndex((item: any) => item.id === itemData.itemId);

    if (itemIndex === -1) {
      throw new NotFoundException(`Checklist item ${itemData.itemId} not found`);
    }

    items[itemIndex].completed = true;
    items[itemIndex].completedAt = new Date();
    if (itemData.notes) {
      items[itemIndex].notes = itemData.notes;
    }

    // Calculate completion percentage
    const completedCount = items.filter((item: any) => item.completed).length;
    const completion = (completedCount / items.length) * 100;

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        checklistItems: JSON.stringify(items),
        checklistCompletion: completion,
      },
    });

    console.log(`✅ Checklist item completed: ${itemData.itemId} (${completion.toFixed(0)}% complete)`);

    return this.findOne(id);
  }

  // ==================== COMPLETION STATUS ====================

  /**
   * Record completion status (FULL, PARTIAL, FAILED)
   */
  async recordCompletion(id: string, completionData: RecordCompletionDto) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        serviceOrder: true,
      },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    if (execution.status !== ExecutionStatus.COMPLETED) {
      throw new BadRequestException('Must check-out before recording completion status');
    }

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        completionStatus: completionData.completionStatus,
        incompleteReason: completionData.incompleteReason,
        notes: execution.notes
          ? `${execution.notes}\n\nCompletion: ${completionData.notes || ''}`
          : completionData.notes,
      },
    });

    // Update service order based on completion
    let serviceOrderStatus = 'COMPLETED';
    if (completionData.completionStatus === CompletionStatus.FAILED) {
      serviceOrderStatus = 'FAILED';
      // TODO: Create task for operator to review and potentially reschedule
    } else if (completionData.completionStatus === CompletionStatus.INCOMPLETE) {
      serviceOrderStatus = 'PARTIALLY_COMPLETED';
      // TODO: Create task for follow-up visit
    }

    await this.prisma.serviceOrder.update({
      where: { id: execution.serviceOrderId },
      data: {
        status: serviceOrderStatus,
      },
    });

    console.log(`📊 Execution ${id} completed: ${completionData.completionStatus}`);

    return this.findOne(id);
  }

  // ==================== MEDIA MANAGEMENT ====================

  /**
   * Upload photo (before/after)
   */
  async uploadPhoto(id: string, photoData: UploadPhotoDto) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    const existingPhotos = execution.photos ? (execution.photos as any[]) : [];
    const newPhoto = {
      url: photoData.url,
      type: photoData.type,
      caption: photoData.caption,
      uploadedAt: new Date(),
    };

    const updatedPhotos = [...existingPhotos, newPhoto];

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        photos: updatedPhotos as any,
      },
    });

    console.log(`📷 Photo uploaded for execution ${id}: ${photoData.type}`);

    return this.findOne(id);
  }

  /**
   * Upload audio note
   */
  async uploadAudioNote(id: string, audioData: UploadAudioNoteDto) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    const existingAudio = execution.audioRecordings ? (execution.audioRecordings as any[]) : [];
    const newAudio = {
      url: audioData.url,
      duration: audioData.duration,
      notes: audioData.notes,
      uploadedAt: new Date(),
    };

    const updatedAudio = [...existingAudio, newAudio];

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        audioRecordings: updatedAudio as any,
      },
    });

    console.log(`🎤 Audio note uploaded for execution ${id}: ${audioData.duration}s`);

    return this.findOne(id);
  }

  // ==================== CUSTOMER FEEDBACK ====================

  /**
   * Submit customer feedback (rating + signature)
   */
  async submitCustomerFeedback(id: string, feedbackData: CustomerFeedbackDto) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    if (execution.status !== ExecutionStatus.COMPLETED) {
      throw new BadRequestException('Execution must be completed before collecting feedback');
    }

    if (feedbackData.rating < 1 || feedbackData.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        customerRating: feedbackData.rating,
        customerFeedback: feedbackData.feedback,
        customerSignature: feedbackData.signature,
      },
    });

    // TODO: Trigger WCF generation with signature
    // TODO: Update provider rating based on feedback
    // TODO: Send thank you email to customer
    console.log(`⭐ Customer feedback received for execution ${id}: ${feedbackData.rating}/5`);

    return this.findOne(id);
  }

  // ==================== BLOCKING LOGIC ====================

  /**
   * Block execution (called when Go Exec becomes NOK)
   */
  async blockExecution(id: string, reason: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        canCheckIn: false,
        blockedReason: reason,
      },
    });

    // TODO: Send alert to provider
    // TODO: Create task for operator
    console.log(`🚫 Execution ${id} blocked: ${reason}`);

    return updated;
  }

  /**
   * Unblock execution (called when Go Exec override or issue resolved)
   */
  async unblockExecution(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        canCheckIn: true,
        blockedReason: null,
      },
    });

    // TODO: Send notification to provider that execution is unblocked
    console.log(`✅ Execution ${id} unblocked`);

    return updated;
  }

  // ==================== STATISTICS ====================

  /**
   * Get execution statistics
   */
  async getStatistics(filters?: { workTeamId?: string }) {
    const where: any = {};

    if (filters?.workTeamId) {
      where.workTeamId = filters.workTeamId;
    }

    const [
      total,
      byStatus,
      byCompletion,
      averageHours,
      averageRating,
      blocked,
    ] = await Promise.all([
      this.prisma.execution.count({ where }),
      this.prisma.execution.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.execution.groupBy({
        by: ['completionStatus'],
        where: {
          ...where,
          completionStatus: {
            not: null,
          },
        },
        _count: true,
      }),
      this.calculateAverageHours(where),
      this.calculateAverageRating(where),
      this.prisma.execution.count({
        where: {
          ...where,
          canCheckIn: false,
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc: any, item: any) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byCompletion: byCompletion.reduce((acc: any, item: any) => {
        acc[item.completionStatus] = item._count;
        return acc;
      }, {}),
      averageActualHours: averageHours,
      averageCustomerRating: averageRating,
      blockedExecutions: blocked,
    };
  }

  /**
   * Calculate average execution hours
   */
  private async calculateAverageHours(where: any): Promise<number | null> {
    const executions = await this.prisma.execution.findMany({
      where: {
        ...where,
        actualHours: {
          not: null,
        },
      },
      select: {
        actualHours: true,
      },
    });

    if (executions.length === 0) {
      return null;
    }

    const totalHours = executions.reduce((sum: number, ex: any) => sum + ex.actualHours, 0);
    return totalHours / executions.length;
  }

  /**
   * Calculate average customer rating
   */
  private async calculateAverageRating(where: any): Promise<number | null> {
    const executions = await this.prisma.execution.findMany({
      where: {
        ...where,
        customerRating: {
          not: null,
        },
      },
      select: {
        customerRating: true,
      },
    });

    if (executions.length === 0) {
      return null;
    }

    const totalRating = executions.reduce((sum: number, ex: any) => sum + ex.customerRating, 0);
    return totalRating / executions.length;
  }
}
