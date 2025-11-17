import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GenerateWcfDto } from './dto/generate-wcf.dto';
import { SubmitWcfDto } from './dto/submit-wcf.dto';

interface WcfRecord {
  serviceOrderId: string;
  pdfUrl: string;
  thumbnailUrl: string;
  accepted: boolean | null;
  signatureDataUrl?: string;
  refusalReason?: string;
  version: number;
}

@Injectable()
export class WcfService {
  private readonly storage = new Map<string, WcfRecord>();
  private readonly cdn = process.env.MEDIA_CDN_BASE || 'https://cdn.yellow-grid.local';

  generate(dto: GenerateWcfDto): WcfRecord {
    const key = `${dto.serviceOrderId}/wcf-${randomUUID()}.pdf`;
    const record: WcfRecord = {
      serviceOrderId: dto.serviceOrderId,
      pdfUrl: `${this.cdn}/${key}`,
      thumbnailUrl: `${this.cdn}/thumbs/${key}`,
      accepted: null,
      version: 1,
    };
    this.storage.set(dto.serviceOrderId, record);
    return record;
  }

  submit(dto: SubmitWcfDto): WcfRecord {
    const existing = this.storage.get(dto.serviceOrderId);
    const record: WcfRecord = {
      serviceOrderId: dto.serviceOrderId,
      pdfUrl: existing?.pdfUrl || `${this.cdn}/${dto.serviceOrderId}/wcf-${randomUUID()}.pdf`,
      thumbnailUrl: existing?.thumbnailUrl || `${this.cdn}/thumbs/${dto.serviceOrderId}.jpg`,
      accepted: dto.accepted,
      signatureDataUrl: dto.signatureDataUrl,
      refusalReason: dto.refusalReason,
      version: (existing?.version ?? 0) + 1,
    };
    this.storage.set(dto.serviceOrderId, record);
    return record;
  }

  get(serviceOrderId: string): WcfRecord | undefined {
    return this.storage.get(serviceOrderId);
  }
}
