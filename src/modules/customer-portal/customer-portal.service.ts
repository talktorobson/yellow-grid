import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Customer Portal Service
 *
 * Handles customer self-service portal operations.
 * Access tokens are service order IDs or short hashes.
 */
@Injectable()
export class CustomerPortalService {
  private readonly logger = new Logger(CustomerPortalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get service order by access token
   *
   * The access token can be:
   * - The service order UUID
   * - The external service order ID
   * - A short hash (future implementation)
   */
  async getServiceOrderByToken(accessToken: string) {
    this.logger.log(`Fetching service order for token: ${accessToken.substring(0, 8)}...`);

    const serviceOrderInclude = {
      service: {
        select: {
          name: true,
          serviceType: true,
          description: true,
        },
      },
      assignedProvider: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      assignedWorkTeam: {
        select: {
          name: true,
        },
      },
      lineItems: {
        select: {
          id: true,
          lineType: true,
          productName: true,
          quantity: true,
          deliveryStatus: true,
          executionStatus: true,
        },
      },
      contracts: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: {
          id: true,
          status: true,
          signedAt: true,
        },
      },
      workCompletionForms: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: {
          id: true,
          status: true,
          customerAcceptedAt: true,
        },
      },
    };

    // Try to find by UUID first
    let serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: accessToken },
      include: serviceOrderInclude,
    });

    // If not found by UUID, try external ID
    if (!serviceOrder) {
      serviceOrder = await this.prisma.serviceOrder.findFirst({
        where: { externalServiceOrderId: accessToken },
        include: serviceOrderInclude,
      });
    }

    if (!serviceOrder) {
      return null;
    }

    // Extract customer info from JSON field
    const customerInfo = (serviceOrder.customerInfo as Record<string, any>) || {};

    // Build state history from state and stateChangedAt
    const stateHistory = [
      {
        state: serviceOrder.state,
        timestamp:
          serviceOrder.stateChangedAt?.toISOString() || serviceOrder.createdAt.toISOString(),
        actor: 'System',
      },
    ];

    // Transform to customer portal view
    return {
      serviceOrder: {
        id: serviceOrder.id,
        orderNumber:
          serviceOrder.externalServiceOrderId ||
          serviceOrder.salesOrderNumber ||
          serviceOrder.id.substring(0, 8),
        serviceName:
          serviceOrder.service?.name || String(serviceOrder.serviceType).replace(/_/g, ' '),
        serviceType: serviceOrder.serviceType,
        state: serviceOrder.state,
        stateHistory,
        scheduledDate: serviceOrder.scheduledDate?.toISOString(),
        scheduledTimeSlot: serviceOrder.requestedTimeSlot,
        serviceAddress: (serviceOrder.serviceAddress as Record<string, any>) || {
          street: customerInfo.address?.street || '',
          city: customerInfo.address?.city || '',
          postalCode: customerInfo.address?.postalCode || '',
        },
        assignedProvider: serviceOrder.assignedProvider
          ? {
              name: serviceOrder.assignedProvider.name,
              phone: serviceOrder.assignedProvider.phone,
            }
          : undefined,
        assignedWorkTeam: serviceOrder.assignedWorkTeam
          ? {
              name: serviceOrder.assignedWorkTeam.name,
            }
          : undefined,
        lineItems: serviceOrder.lineItems.map((item) => ({
          id: item.id,
          lineType: item.lineType,
          name: item.productName || 'Service Item',
          quantity: item.quantity,
          deliveryStatus: item.deliveryStatus,
          executionStatus: item.executionStatus,
        })),
        contract: serviceOrder.contracts[0]
          ? {
              id: serviceOrder.contracts[0].id,
              status: serviceOrder.contracts[0].status,
              signedAt: serviceOrder.contracts[0].signedAt?.toISOString(),
            }
          : undefined,
        wcf: serviceOrder.workCompletionForms[0]
          ? {
              id: serviceOrder.workCompletionForms[0].id,
              status: serviceOrder.workCompletionForms[0].status,
              signedAt: serviceOrder.workCompletionForms[0].customerAcceptedAt?.toISOString(),
            }
          : undefined,
      },
      customer: {
        name: customerInfo.name || 'Customer',
        email: customerInfo.email,
        phone: customerInfo.phone,
      },
    };
  }

  /**
   * Get WCF data for service order
   */
  async getWCFData(accessToken: string) {
    // First get the service order
    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: {
        OR: [{ id: accessToken }, { externalServiceOrderId: accessToken }],
      },
      include: {
        workCompletionForms: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            signatures: true,
          },
        },
        service: {
          select: {
            name: true,
            scopeIncluded: true,
          },
        },
      },
    });

    if (!serviceOrder) {
      return null;
    }

    const wcf = serviceOrder.workCompletionForms[0];
    const scopeItems = (serviceOrder.service?.scopeIncluded as string[]) || [];

    // Get signatures from WCF
    const customerSignature = wcf?.signatures?.find((s) => s.signerType === 'CUSTOMER');
    const technicianSignature = wcf?.signatures?.find((s) => s.signerType === 'TECHNICIAN');

    return {
      wcf: wcf
        ? {
            id: wcf.id,
            status: wcf.status,
            signedAt: wcf.customerAcceptedAt?.toISOString(),
            customerSignature: customerSignature?.signedAt ? 'Signed' : undefined,
            technicianSignature: technicianSignature?.signedAt ? 'Signed' : undefined,
            workDescription: wcf.workSummary,
            customerComments: wcf.customerFeedback,
          }
        : null,
      checklistItems: scopeItems.map((item, index) => ({
        id: String(index + 1),
        text: item,
        completed: false, // Would need separate tracking
        required: true,
      })),
      serviceOrder: {
        id: serviceOrder.id,
        serviceName:
          serviceOrder.service?.name || String(serviceOrder.serviceType).replace(/_/g, ' '),
      },
    };
  }

  /**
   * Get photos for service order
   */
  async getPhotos(accessToken: string) {
    // Find WCF photos linked to service order
    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: {
        OR: [{ id: accessToken }, { externalServiceOrderId: accessToken }],
      },
      include: {
        workCompletionForms: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            photos: {
              orderBy: { sequence: 'asc' },
              select: {
                id: true,
                photoType: true,
                caption: true,
                photoUrl: true,
                thumbnailUrl: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!serviceOrder) {
      return { photos: [] };
    }

    const wcf = serviceOrder.workCompletionForms[0];
    if (!wcf || !wcf.photos) {
      return { photos: [] };
    }

    return {
      photos: wcf.photos.map((photo) => ({
        id: photo.id,
        url: photo.photoUrl,
        thumbnailUrl: photo.thumbnailUrl || photo.photoUrl,
        caption: photo.caption,
        category: photo.photoType,
        createdAt: photo.createdAt.toISOString(),
      })),
    };
  }
}
