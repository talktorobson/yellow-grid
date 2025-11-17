import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';
import type { Photo as PhotoType } from '@types/checkin-checkout.types';

export class Photo extends Model {
  static table = 'photos';

  @field('server_id') serverId?: string;
  @field('service_order_id') serviceOrderId!: string;
  @field('uri') uri!: string;
  @field('type') type!: string;
  @field('caption') caption?: string;
  @json('location', (json) => json) location?: PhotoType['location'];
  @field('uploaded') uploaded!: boolean;
  @field('uploaded_url') uploadedUrl?: string;
  @date('synced_at') syncedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  toAPI(): Partial<PhotoType> {
    return {
      id: this.serverId || this.id,
      uri: this.uri,
      type: this.type as PhotoType['type'],
      caption: this.caption,
      location: this.location,
      uploaded: this.uploaded,
      uploadedUrl: this.uploadedUrl,
      timestamp: this.createdAt.toISOString(),
    };
  }
}
