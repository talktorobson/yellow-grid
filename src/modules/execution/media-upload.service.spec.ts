import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { MediaUploadService } from './media-upload.service';
import { MediaUploadRequestDto } from './dto/media-upload.dto';

// Mock @google-cloud/storage
const mockGetSignedUrl = jest.fn();
const mockSave = jest.fn();
const mockDelete = jest.fn();
const mockExists = jest.fn();
const mockGetMetadata = jest.fn();

const mockFile = jest.fn(() => ({
  getSignedUrl: mockGetSignedUrl,
  save: mockSave,
  delete: mockDelete,
  exists: mockExists,
  getMetadata: mockGetMetadata,
}));

const mockBucket = jest.fn(() => ({
  file: mockFile,
}));

jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn(() => ({
      bucket: mockBucket,
    })),
  };
});

// Mock sharp
jest.mock('sharp', () => {
  const mockResize = jest.fn().mockReturnThis();
  const mockJpeg = jest.fn().mockReturnThis();
  const mockToBuffer = jest.fn().mockResolvedValue(Buffer.from('thumbnail'));

  const sharp = jest.fn(() => ({
    resize: mockResize,
    jpeg: mockJpeg,
    toBuffer: mockToBuffer,
  }));

  return sharp;
});

describe('MediaUploadService', () => {
  let service: MediaUploadService;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaUploadService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'GCS_PROJECT_ID':
                  return 'test-project';
                case 'GCS_BUCKET':
                  return 'test-bucket';
                case 'MEDIA_CDN_BASE':
                  return 'https://storage.googleapis.com/test-bucket';
                case 'GCS_KEY_FILE':
                  return undefined; // Use default credentials
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MediaUploadService>(MediaUploadService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUpload', () => {
    it('should generate signed URLs for image upload', async () => {
      const dto: MediaUploadRequestDto = {
        serviceOrderId: 'so-123',
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1024 * 1024, // 1MB
      };

      mockGetSignedUrl
        .mockResolvedValueOnce(['https://upload.url'])
        .mockResolvedValueOnce(['https://media.url'])
        .mockResolvedValueOnce(['https://thumbnail.url']);

      const result = await service.createUpload(dto);

      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('mediaUrl');
      expect(result).toHaveProperty('thumbnailUrl');
      expect(result).toHaveProperty('key');
      expect(result.key).toContain('so-123');
      expect(result.key).toContain('photos');
      expect(result.key).toContain('photo.jpg');
    });

    it('should generate signed URLs for video upload', async () => {
      const dto: MediaUploadRequestDto = {
        serviceOrderId: 'so-456',
        filename: 'video.mp4',
        contentType: 'video/mp4',
        sizeBytes: 50 * 1024 * 1024, // 50MB
      };

      mockGetSignedUrl
        .mockResolvedValueOnce(['https://upload.url'])
        .mockResolvedValueOnce(['https://media.url']);

      const result = await service.createUpload(dto);

      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('mediaUrl');
      expect(result.key).toContain('so-456');
      expect(result.key).toContain('videos');
      expect(result.key).toContain('video.mp4');
      // For videos, thumbnail URL should be same as media URL
      expect(result.thumbnailUrl).toBe(result.mediaUrl);
    });

    it('should throw BadRequestException for oversized photo', async () => {
      const dto: MediaUploadRequestDto = {
        serviceOrderId: 'so-123',
        filename: 'large-photo.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 26 * 1024 * 1024, // 26MB (exceeds 25MB limit)
      };

      await expect(service.createUpload(dto)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.createUpload(dto)).rejects.toThrow(
        /Photo size exceeds maximum/
      );
    });

    it('should throw BadRequestException for oversized video', async () => {
      const dto: MediaUploadRequestDto = {
        serviceOrderId: 'so-123',
        filename: 'large-video.mp4',
        contentType: 'video/mp4',
        sizeBytes: 1.1 * 1024 * 1024 * 1024, // 1.1GB (exceeds 1GB limit)
      };

      await expect(service.createUpload(dto)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.createUpload(dto)).rejects.toThrow(
        /Video size exceeds maximum/
      );
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const dto: MediaUploadRequestDto = {
        serviceOrderId: 'so-123',
        filename: 'document.txt',
        contentType: 'text/plain',
        sizeBytes: 1024,
      };

      await expect(service.createUpload(dto)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.createUpload(dto)).rejects.toThrow(
        /Unsupported file type/
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload image file and generate thumbnail', async () => {
      const dto: MediaUploadRequestDto = {
        serviceOrderId: 'so-123',
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1024 * 1024,
      };
      const buffer = Buffer.from('fake-image-data');

      mockSave.mockResolvedValue(undefined);
      mockGetSignedUrl
        .mockResolvedValueOnce(['https://thumbnail.url'])
        .mockResolvedValueOnce(['https://media.url']);

      const result = await service.uploadFile(buffer, dto);

      expect(mockSave).toHaveBeenCalledTimes(2); // Original + thumbnail
      expect(result).toHaveProperty('mediaUrl');
      expect(result).toHaveProperty('thumbnailUrl');
      expect(result.key).toContain('so-123');
    });

    it('should upload PDF file without thumbnail', async () => {
      const dto: MediaUploadRequestDto = {
        serviceOrderId: 'so-123',
        filename: 'document.pdf',
        contentType: 'application/pdf',
        sizeBytes: 5 * 1024 * 1024,
      };
      const buffer = Buffer.from('fake-pdf-data');

      mockSave.mockResolvedValue(undefined);
      mockGetSignedUrl
        .mockResolvedValueOnce(['https://media.url'])
        .mockResolvedValueOnce(['https://media.url']);

      const result = await service.uploadFile(buffer, dto);

      expect(mockSave).toHaveBeenCalledTimes(1); // Only original, no thumbnail
      expect(result).toHaveProperty('mediaUrl');
      expect(result.thumbnailUrl).toBe(result.mediaUrl);
    });
  });

  describe('deleteFile', () => {
    it('should delete file and thumbnail if exists', async () => {
      const key = 'so-123/photos/photo.jpg';

      mockDelete.mockResolvedValue(undefined);
      mockExists.mockResolvedValue([true]);

      await service.deleteFile(key);

      expect(mockDelete).toHaveBeenCalledTimes(2); // Original + thumbnail
    });

    it('should delete only original file if thumbnail does not exist', async () => {
      const key = 'so-123/videos/video.mp4';

      mockDelete.mockResolvedValue(undefined);
      mockExists.mockResolvedValue([false]);

      await service.deleteFile(key);

      expect(mockDelete).toHaveBeenCalledTimes(1); // Only original
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      const key = 'so-123/photos/photo.jpg';
      mockExists.mockResolvedValue([true]);

      const result = await service.fileExists(key);

      expect(result).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      const key = 'so-123/photos/nonexistent.jpg';
      mockExists.mockResolvedValue([false]);

      const result = await service.fileExists(key);

      expect(result).toBe(false);
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate signed download URL', async () => {
      const key = 'so-123/photos/photo.jpg';
      mockGetSignedUrl.mockResolvedValue(['https://download.url']);

      const url = await service.getDownloadUrl(key);

      expect(url).toBe('https://download.url');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 'v4',
          action: 'read',
        })
      );
    });

    it('should accept custom expiration time', async () => {
      const key = 'so-123/photos/photo.jpg';
      const expiresInMs = 30 * 60 * 1000; // 30 minutes
      mockGetSignedUrl.mockResolvedValue(['https://download.url']);

      await service.getDownloadUrl(key, expiresInMs);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'read',
        })
      );
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      const key = 'so-123/photos/photo.jpg';
      const metadata = {
        name: 'photo.jpg',
        size: 1024,
        contentType: 'image/jpeg',
      };
      mockGetMetadata.mockResolvedValue([metadata]);

      const result = await service.getFileMetadata(key);

      expect(result).toEqual(metadata);
    });
  });
});
