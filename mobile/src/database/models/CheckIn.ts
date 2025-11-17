import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';
import type { CheckIn as CheckInType } from '@types/checkin-checkout.types';

export class CheckIn extends Model {
  static table = 'check_ins';

  @field('server_id') serverId?: string;
  @field('service_order_id') serviceOrderId!: string;
  @field('technician_id') technicianId!: string;
  @json('scheduled_arrival_window', (json) => json) scheduledArrivalWindow!: {
    start: string;
    end: string;
  };
  @field('actual_arrival_time') actualArrivalTime!: string;
  @field('check_in_time') checkInTime!: string;
  @field('check_in_method') checkInMethod!: string;
  @json('location', (json) => json) location!: CheckInType['location'];
  @field('location_accuracy') locationAccuracy!: number;
  @field('location_verified') locationVerified!: boolean;
  @json('arrival_photos', (json) => json) arrivalPhotos!: CheckInType['arrivalPhotos'];
  @field('customer_present') customerPresent!: boolean;
  @json('customer_signature', (json) => json) customerSignature?: CheckInType['customerSignature'];
  @field('site_access_notes') siteAccessNotes?: string;
  @json('safety_hazards', (json) => json) safetyHazards!: CheckInType['safetyHazards'];
  @field('status') status!: string;
  @json('metadata', (json) => json) metadata!: CheckInType['metadata'];
  @date('synced_at') syncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  toAPI(): Partial<CheckInType> {
    return {
      id: this.serverId || this.id,
      serviceOrderId: this.serviceOrderId,
      technicianId: this.technicianId,
      scheduledArrivalWindow: this.scheduledArrivalWindow,
      actualArrivalTime: this.actualArrivalTime,
      checkInTime: this.checkInTime,
      checkInMethod: this.checkInMethod as CheckInType['checkInMethod'],
      location: this.location,
      locationAccuracy: this.locationAccuracy,
      locationVerified: this.locationVerified,
      arrivalPhotos: this.arrivalPhotos,
      customerPresent: this.customerPresent,
      customerSignature: this.customerSignature,
      siteAccessNotes: this.siteAccessNotes,
      safetyHazards: this.safetyHazards,
      status: this.status as CheckInType['status'],
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      syncedAt: this.syncedAt?.toISOString(),
    };
  }
}
