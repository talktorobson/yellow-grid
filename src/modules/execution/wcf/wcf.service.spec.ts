import { WcfService } from './wcf.service';

describe('WcfService', () => {
  const service = new WcfService();

  it('generates WCF record with URLs', () => {
    const record = service.generate({
      serviceOrderId: 'so1',
      customerName: 'Customer',
      technicianName: 'Tech',
    });

    expect(record.pdfUrl).toContain('so1');
    expect(record.thumbnailUrl).toContain('thumbs');
    expect(record.accepted).toBeNull();
  });

  it('submits acceptance and stores signature', () => {
    service.generate({ serviceOrderId: 'so2', customerName: 'Customer' });
    const record = service.submit({
      serviceOrderId: 'so2',
      accepted: true,
      signatureDataUrl: 'data:image/png;base64,abc',
    });

    expect(record.accepted).toBe(true);
    expect(record.signatureDataUrl).toBeDefined();
    expect(service.get('so2')?.version).toBe(record.version);
  });
});
