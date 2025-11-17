import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';
import type { ServiceOrder as ServiceOrderType } from '@types/service-order.types';

export class ServiceOrder extends Model {
  static table = 'service_orders';

  @field('server_id') serverId!: string;
  @field('order_number') orderNumber!: string;
  @field('project_id') projectId!: string;
  @field('project_name') projectName!: string;
  @field('service_type') serviceType!: string;
  @field('priority') priority!: string;
  @field('status') status!: string;
  @field('scheduled_date') scheduledDate!: string;
  @json('scheduled_time_slot', (json) => json) scheduledTimeSlot!: {
    start: string;
    end: string;
    timezone: string;
  };
  @field('estimated_duration') estimatedDuration!: number;
  @json('customer', (json) => json) customer!: ServiceOrderType['customer'];
  @json('site_address', (json) => json) siteAddress!: ServiceOrderType['siteAddress'];
  @json('products', (json) => json) products!: ServiceOrderType['products'];
  @field('service_description') serviceDescription!: string;
  @field('special_instructions') specialInstructions?: string;
  @field('assigned_provider_id') assignedProviderId?: string;
  @field('assigned_work_team_id') assignedWorkTeamId?: string;
  @field('check_in_id') checkInId?: string;
  @field('check_out_id') checkOutId?: string;
  @date('synced_at') syncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Convert to API format
  toAPI(): Partial<ServiceOrderType> {
    return {
      id: this.serverId,
      orderNumber: this.orderNumber,
      projectId: this.projectId,
      projectName: this.projectName,
      serviceType: this.serviceType as ServiceOrderType['serviceType'],
      priority: this.priority as ServiceOrderType['priority'],
      status: this.status as ServiceOrderType['status'],
      scheduledDate: this.scheduledDate,
      scheduledTimeSlot: this.scheduledTimeSlot,
      estimatedDuration: this.estimatedDuration,
      customer: this.customer,
      siteAddress: this.siteAddress,
      products: this.products,
      serviceDescription: this.serviceDescription,
      specialInstructions: this.specialInstructions,
      assignedProviderId: this.assignedProviderId,
      assignedWorkTeamId: this.assignedWorkTeamId,
      checkInId: this.checkInId,
      checkOutId: this.checkOutId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
