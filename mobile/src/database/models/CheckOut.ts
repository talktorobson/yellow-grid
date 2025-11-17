import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';
import type { CheckOut as CheckOutType } from '@types/checkin-checkout.types';

export class CheckOut extends Model {
  static table = 'check_outs';

  @field('server_id') serverId?: string;
  @field('service_order_id') serviceOrderId!: string;
  @field('check_in_id') checkInId!: string;
  @field('technician_id') technicianId!: string;
  @field('check_out_time') checkOutTime!: string;
  @field('completion_status') completionStatus!: string;
  @json('work_performed', (json) => json) workPerformed!: CheckOutType['workPerformed'];
  @json('materials_used', (json) => json) materialsUsed!: CheckOutType['materialsUsed'];
  @json('departure_photos', (json) => json) departurePhotos!: CheckOutType['departurePhotos'];
  @json('customer_signature', (json) => json) customerSignature?: CheckOutType['customerSignature'];
  @json('customer_feedback', (json) => json) customerFeedback?: CheckOutType['customerFeedback'];
  @field('next_visit_required') nextVisitRequired!: boolean;
  @field('next_visit_reason') nextVisitReason?: string;
  @json('location', (json) => json) location!: CheckOutType['location'];
  @field('status') status!: string;
  @json('metadata', (json) => json) metadata!: CheckOutType['metadata'];
  @date('synced_at') syncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  toAPI(): Partial<CheckOutType> {
    return {
      id: this.serverId || this.id,
      serviceOrderId: this.serviceOrderId,
      checkInId: this.checkInId,
      technicianId: this.technicianId,
      checkOutTime: this.checkOutTime,
      completionStatus: this.completionStatus as CheckOutType['completionStatus'],
      workPerformed: this.workPerformed,
      materialsUsed: this.materialsUsed,
      departurePhotos: this.departurePhotos,
      customerSignature: this.customerSignature,
      customerFeedback: this.customerFeedback,
      nextVisitRequired: this.nextVisitRequired,
      nextVisitReason: this.nextVisitReason,
      location: this.location,
      status: this.status as CheckOutType['status'],
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      syncedAt: this.syncedAt?.toISOString(),
    };
  }
}
