import { MediaUploadService } from './media-upload.service';

describe('MediaUploadService', () => {
  it('generates stubbed upload URLs with key', async () => {
    const service = new MediaUploadService();
    const result = await service.createUpload({
      serviceOrderId: 'so1',
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1234,
    });

    expect(result.key).toContain('photo.jpg');
    expect(result.uploadUrl).toContain(result.key);
    expect(result.thumbnailUrl).toContain('thumbs');
  });
});
