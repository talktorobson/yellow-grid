import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket } from '@google-cloud/storage';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { MediaUploadRequestDto } from './dto/media-upload.dto';

interface MediaUploadResponse {
  uploadUrl: string;
  mediaUrl: string;
  thumbnailUrl: string;
  key: string;
}

interface MediaMetadata {
  contentType: string;
  originalFilename: string;
  serviceOrderId: string;
  uploadedAt: string;
  size: number;
}

@Injectable()
export class MediaUploadService {
  private readonly logger = new Logger(MediaUploadService.name);
  private readonly storage: Storage;
  private readonly bucket: Bucket;
  private readonly bucketName: string;
  private readonly cdnBase: string;
  private readonly projectId?: string;

  // File size limits (in bytes)
  private readonly MAX_PHOTO_SIZE = 25 * 1024 * 1024; // 25MB
  private readonly MAX_VIDEO_SIZE = 1 * 1024 * 1024 * 1024; // 1GB
  private readonly MAX_DOCUMENT_SIZE = 100 * 1024 * 1024; // 100MB

  // Thumbnail settings
  private readonly THUMBNAIL_WIDTH = 300;
  private readonly THUMBNAIL_HEIGHT = 300;
  private readonly THUMBNAIL_QUALITY = 80;

  // Supported MIME types
  private readonly SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
  ];
  private readonly SUPPORTED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
  ];
  private readonly SUPPORTED_DOCUMENT_TYPES = [
    'application/pdf',
  ];

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('GCS_PROJECT_ID');
    this.bucketName = this.configService.get<string>('GCS_BUCKET') || 'yellow-grid-media';
    this.cdnBase = this.configService.get<string>('MEDIA_CDN_BASE') ||
      `https://storage.googleapis.com/${this.bucketName}`;

    const keyFilename = this.configService.get<string>('GCS_KEY_FILE');

    // Initialize GCS client
    const storageOptions: any = {};
    if (this.projectId) {
      storageOptions.projectId = this.projectId;
    }
    if (keyFilename) {
      storageOptions.keyFilename = keyFilename;
    }

    this.storage = new Storage(storageOptions);
    this.bucket = this.storage.bucket(this.bucketName);

    this.logger.log(`Initialized GCS client for bucket: ${this.bucketName}`);
  }

  /**
   * Validate file size based on type
   */
  private validateFileSize(dto: MediaUploadRequestDto): void {
    const { contentType, sizeBytes } = dto;

    if (this.SUPPORTED_IMAGE_TYPES.includes(contentType)) {
      if (sizeBytes > this.MAX_PHOTO_SIZE) {
        throw new BadRequestException(
          `Photo size exceeds maximum allowed size of ${this.MAX_PHOTO_SIZE / 1024 / 1024}MB`
        );
      }
    } else if (this.SUPPORTED_VIDEO_TYPES.includes(contentType)) {
      if (sizeBytes > this.MAX_VIDEO_SIZE) {
        throw new BadRequestException(
          `Video size exceeds maximum allowed size of ${this.MAX_VIDEO_SIZE / 1024 / 1024 / 1024}GB`
        );
      }
    } else if (this.SUPPORTED_DOCUMENT_TYPES.includes(contentType)) {
      if (sizeBytes > this.MAX_DOCUMENT_SIZE) {
        throw new BadRequestException(
          `Document size exceeds maximum allowed size of ${this.MAX_DOCUMENT_SIZE / 1024 / 1024}MB`
        );
      }
    } else {
      throw new BadRequestException(`Unsupported file type: ${contentType}`);
    }
  }

  /**
   * Generate unique storage key for media file
   */
  private generateStorageKey(dto: MediaUploadRequestDto): string {
    const timestamp = Date.now();
    const uuid = randomUUID();
    const sanitizedFilename = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Organize by service order and type
    const mediaType = this.getMediaType(dto.contentType);
    return `${dto.serviceOrderId}/${mediaType}/${timestamp}-${uuid}-${sanitizedFilename}`;
  }

  /**
   * Get media type from content type
   */
  private getMediaType(contentType: string): string {
    if (this.SUPPORTED_IMAGE_TYPES.includes(contentType)) {
      return 'photos';
    } else if (this.SUPPORTED_VIDEO_TYPES.includes(contentType)) {
      return 'videos';
    } else if (this.SUPPORTED_DOCUMENT_TYPES.includes(contentType)) {
      return 'documents';
    }
    return 'other';
  }

  /**
   * Generate thumbnail key from original key
   */
  private getThumbnailKey(originalKey: string): string {
    return `thumbs/${originalKey}`;
  }

  /**
   * Check if file type supports thumbnail generation
   */
  private supportsThumbnails(contentType: string): boolean {
    return this.SUPPORTED_IMAGE_TYPES.includes(contentType);
  }

  /**
   * Create a pre-signed upload URL for direct client upload
   */
  async createUpload(dto: MediaUploadRequestDto): Promise<MediaUploadResponse> {
    this.logger.debug(`Creating upload for file: ${dto.filename}`);

    // Validate file size
    this.validateFileSize(dto);

    // Generate storage key
    const key = this.generateStorageKey(dto);
    const thumbnailKey = this.getThumbnailKey(key);

    // Prepare metadata
    const metadata: MediaMetadata = {
      contentType: dto.contentType,
      originalFilename: dto.filename,
      serviceOrderId: dto.serviceOrderId,
      uploadedAt: new Date().toISOString(),
      size: dto.sizeBytes,
    };

    // Generate signed URL for upload (valid for 1 hour)
    const file = this.bucket.file(key);
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      contentType: dto.contentType,
      extensionHeaders: {
        'x-goog-meta-service-order-id': dto.serviceOrderId,
        'x-goog-meta-original-filename': dto.filename,
      },
    });

    // Generate signed URL for reading (valid for 7 days)
    const [mediaUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Generate thumbnail URL if applicable
    let thumbnailUrl: string;
    if (this.supportsThumbnails(dto.contentType)) {
      const thumbnailFile = this.bucket.file(thumbnailKey);
      const [signedThumbnailUrl] = await thumbnailFile.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      thumbnailUrl = signedThumbnailUrl;
    } else {
      // Return a placeholder or the original URL for non-image files
      thumbnailUrl = mediaUrl;
    }

    this.logger.log(`Generated signed upload URL for key: ${key}`);

    return {
      uploadUrl,
      mediaUrl,
      thumbnailUrl,
      key,
    };
  }

  /**
   * Upload file buffer directly to GCS (server-side upload)
   */
  async uploadFile(
    buffer: Buffer,
    dto: MediaUploadRequestDto,
  ): Promise<MediaUploadResponse> {
    this.logger.debug(`Uploading file: ${dto.filename} (${dto.sizeBytes} bytes)`);

    // Validate file size
    this.validateFileSize(dto);

    // Generate storage key
    const key = this.generateStorageKey(dto);
    const file = this.bucket.file(key);

    // Upload the file
    await file.save(buffer, {
      contentType: dto.contentType,
      metadata: {
        metadata: {
          serviceOrderId: dto.serviceOrderId,
          originalFilename: dto.filename,
          uploadedAt: new Date().toISOString(),
        },
      },
      resumable: dto.sizeBytes > 10 * 1024 * 1024, // Use resumable upload for files > 10MB
    });

    this.logger.log(`Uploaded file to GCS: ${key}`);

    // Generate thumbnail if it's an image
    let thumbnailUrl: string;
    if (this.supportsThumbnails(dto.contentType)) {
      thumbnailUrl = await this.generateThumbnail(buffer, key);
    } else {
      // For non-image files, use the original file URL as thumbnail
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      thumbnailUrl = url;
    }

    // Generate signed URLs
    const [mediaUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      uploadUrl: mediaUrl, // For server-side upload, upload URL is same as media URL
      mediaUrl,
      thumbnailUrl,
      key,
    };
  }

  /**
   * Generate thumbnail from image buffer
   */
  async generateThumbnail(imageBuffer: Buffer, originalKey: string): Promise<string> {
    this.logger.debug(`Generating thumbnail for: ${originalKey}`);

    try {
      // Generate thumbnail using sharp
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(this.THUMBNAIL_WIDTH, this.THUMBNAIL_HEIGHT, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: this.THUMBNAIL_QUALITY })
        .toBuffer();

      // Upload thumbnail
      const thumbnailKey = this.getThumbnailKey(originalKey);
      const thumbnailFile = this.bucket.file(thumbnailKey);

      await thumbnailFile.save(thumbnailBuffer, {
        contentType: 'image/jpeg',
        metadata: {
          metadata: {
            originalKey,
            thumbnailFor: originalKey,
            generatedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Generated and uploaded thumbnail: ${thumbnailKey}`);

      // Return signed URL for thumbnail
      const [thumbnailUrl] = await thumbnailFile.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return thumbnailUrl;
    } catch (error) {
      this.logger.error(`Failed to generate thumbnail for ${originalKey}:`, error);
      // Return a fallback URL or throw depending on requirements
      // For now, we'll return the original file URL
      const file = this.bucket.file(originalKey);
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      return url;
    }
  }

  /**
   * Get a signed URL for downloading a file
   */
  async getDownloadUrl(key: string, expiresInMs: number = 3600000): Promise<string> {
    const file = this.bucket.file(key);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMs,
    });
    return url;
  }

  /**
   * Delete a file and its thumbnail from GCS
   */
  async deleteFile(key: string): Promise<void> {
    this.logger.debug(`Deleting file: ${key}`);

    try {
      // Delete the original file
      const file = this.bucket.file(key);
      await file.delete();
      this.logger.log(`Deleted file: ${key}`);

      // Delete thumbnail if it exists
      const thumbnailKey = this.getThumbnailKey(key);
      const thumbnailFile = this.bucket.file(thumbnailKey);
      const [exists] = await thumbnailFile.exists();

      if (exists) {
        await thumbnailFile.delete();
        this.logger.log(`Deleted thumbnail: ${thumbnailKey}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a file exists in GCS
   */
  async fileExists(key: string): Promise<boolean> {
    const file = this.bucket.file(key);
    const [exists] = await file.exists();
    return exists;
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<any> {
    const file = this.bucket.file(key);
    const [metadata] = await file.getMetadata();
    return metadata;
  }
}
