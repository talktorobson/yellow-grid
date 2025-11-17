import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNumber, IsOptional } from 'class-validator';

export class MediaUploadRequestDto {
  @ApiProperty({ description: 'Service order ID associated with the media' })
  @IsUUID()
  serviceOrderId: string;

  @ApiProperty({ description: 'Original filename', example: 'photo.jpg' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'MIME type', example: 'image/jpeg' })
  @IsString()
  contentType: string;

  @ApiProperty({ description: 'File size in bytes', example: 245000 })
  @IsNumber()
  sizeBytes: number;

  @ApiProperty({ description: 'Optional media kind (photo/video/document)', required: false })
  @IsOptional()
  @IsString()
  kind?: string;
}
