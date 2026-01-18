import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';

/**
 * PDF Generation Service
 *
 * Provides HTML to PDF conversion capabilities for contracts and documents.
 * Uses Handlebars for HTML templating and generates PDF content.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor() {
    // Register common Handlebars helpers
    this.registerHelpers();
  }

  /**
   * Register common Handlebars helpers for templates
   */
  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    });

    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (amount: number, currency = 'EUR') => {
      if (amount === null || amount === undefined) return '';
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });
  }

  /**
   * Render HTML template with data using Handlebars
   */
  renderTemplate(template: string, data: Record<string, any>): string {
    try {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(data);
    } catch (error) {
      this.logger.error(`Failed to render template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate PDF from HTML content
   * Returns base64-encoded PDF content
   */
  async generatePdfFromHtml(
    htmlContent: string,
    options: PdfGenerationOptions = {},
  ): Promise<string> {
    const {
      title = 'Document',
      margins = { top: 50, bottom: 50, left: 50, right: 50 },
      pageSize = 'A4',
    } = options;

    try {
      // Strip HTML tags for text content (basic extraction)
      const textContent = this.stripHtmlToText(htmlContent);
      const lines = this.wrapText(textContent, 80);

      // Generate a proper PDF structure
      const pdfContent = this.createPdfDocument(title, lines, margins, pageSize);

      this.logger.log(`Generated PDF: ${title} (${pdfContent.length} bytes)`);
      return pdfContent;
    } catch (error) {
      this.logger.error(`Failed to generate PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a contract PDF from template and data
   */
  async generateContractPdf(
    template: string,
    data: ContractPdfData,
    options: PdfGenerationOptions = {},
  ): Promise<string> {
    // Render HTML from template
    const htmlContent = this.renderTemplate(template, data);

    // Generate PDF
    return this.generatePdfFromHtml(htmlContent, {
      title: `Contract_${data.contractNumber || 'Document'}`,
      ...options,
    });
  }

  /**
   * Generate a WCF (Work Completion Form) PDF
   */
  async generateWcfPdf(data: WcfPdfData, options: PdfGenerationOptions = {}): Promise<string> {
    const wcfTemplate = this.getWcfTemplate();
    const htmlContent = this.renderTemplate(wcfTemplate, data);

    return this.generatePdfFromHtml(htmlContent, {
      title: `WCF_${data.wcfNumber || 'Document'}`,
      ...options,
    });
  }

  /**
   * Strip HTML tags and convert to plain text
   */
  private stripHtmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Wrap text to specified line width
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxWidth) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * Create a PDF document with proper structure
   */
  private createPdfDocument(
    title: string,
    contentLines: string[],
    margins: { top: number; bottom: number; left: number; right: number },
    pageSize: string,
  ): string {
    // PDF page dimensions (A4 in points: 595 x 842)
    const pageWidth = pageSize === 'A4' ? 595 : 612;
    const pageHeight = pageSize === 'A4' ? 842 : 792;
    const fontSize = 11;
    const lineHeight = 14;
    const usableHeight = pageHeight - margins.top - margins.bottom;
    const linesPerPage = Math.floor(usableHeight / lineHeight);

    // Split content into pages
    const pages: string[][] = [];
    for (let i = 0; i < contentLines.length; i += linesPerPage) {
      pages.push(contentLines.slice(i, i + linesPerPage));
    }

    if (pages.length === 0) {
      pages.push(['(Empty document)']);
    }

    // Build PDF objects
    const objects: string[] = [];
    let objectCount = 0;

    // Object 1: Catalog
    objectCount++;
    objects.push(`${objectCount} 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj`);

    // Object 2: Pages
    objectCount++;
    const pageRefs = pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ');
    objects.push(
      `${objectCount} 0 obj\n<<\n/Type /Pages\n/Kids [${pageRefs}]\n/Count ${pages.length}\n>>\nendobj`,
    );

    // Create page and content objects for each page
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const pageLines = pages[pageIndex];

      // Page object
      objectCount++;
      const pageObjNum = objectCount;
      const contentObjNum = objectCount + 1;

      objects.push(
        `${pageObjNum} 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n/F2 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica-Bold\n>>\n>>\n>>\n/MediaBox [0 0 ${pageWidth} ${pageHeight}]\n/Contents ${contentObjNum} 0 R\n>>\nendobj`,
      );

      // Content stream
      objectCount++;
      let contentStream = 'BT\n';

      // Add title on first page
      if (pageIndex === 0) {
        contentStream += `/F2 14 Tf\n${margins.left} ${pageHeight - margins.top} Td\n(${this.escapePdfString(title)}) Tj\n`;
        contentStream += `0 -${lineHeight * 2} Td\n`;
        contentStream += `/F1 ${fontSize} Tf\n`;
      } else {
        contentStream += `/F1 ${fontSize} Tf\n${margins.left} ${pageHeight - margins.top} Td\n`;
      }

      // Add content lines
      for (let i = 0; i < pageLines.length; i++) {
        const line = this.escapePdfString(pageLines[i]);
        if (i === 0 && pageIndex === 0) {
          contentStream += `(${line}) Tj\n`;
        } else {
          contentStream += `0 -${lineHeight} Td\n(${line}) Tj\n`;
        }
      }

      // Add page number
      contentStream += `0 -${lineHeight * 2} Td\n`;
      contentStream += `(Page ${pageIndex + 1} of ${pages.length}) Tj\n`;
      contentStream += 'ET';

      objects.push(
        `${objectCount} 0 obj\n<<\n/Length ${contentStream.length}\n>>\nstream\n${contentStream}\nendstream\nendobj`,
      );
    }

    // Build the complete PDF
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];

    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj + '\n';
    }

    // Cross-reference table
    const xrefOffset = pdf.length;
    pdf += 'xref\n';
    pdf += `0 ${objectCount + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets) {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }

    // Trailer
    pdf += 'trailer\n';
    pdf += `<<\n/Size ${objectCount + 1}\n/Root 1 0 R\n>>\n`;
    pdf += 'startxref\n';
    pdf += `${xrefOffset}\n`;
    pdf += '%%EOF';

    return Buffer.from(pdf, 'utf-8').toString('base64');
  }

  /**
   * Escape special characters for PDF string
   */
  private escapePdfString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
  }

  /**
   * Get default WCF template
   */
  private getWcfTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Work Completion Form - {{wcfNumber}}</title>
</head>
<body>
  <h1>Work Completion Form</h1>
  <p><strong>WCF Number:</strong> {{wcfNumber}}</p>
  <p><strong>Service Order:</strong> {{serviceOrderId}}</p>
  <p><strong>Date:</strong> {{formatDate serviceDate}}</p>

  <h2>Customer Information</h2>
  <p><strong>Name:</strong> {{customerInfo.name}}</p>
  <p><strong>Address:</strong> {{serviceLocation.street}}, {{serviceLocation.city}} {{serviceLocation.postalCode}}</p>

  <h2>Provider Information</h2>
  <p><strong>Provider:</strong> {{providerInfo.name}}</p>
  <p><strong>Technician:</strong> {{technicianInfo.name}}</p>

  <h2>Work Summary</h2>
  <p>{{workSummary}}</p>

  <h2>Work Details</h2>
  <p>{{workDetails.description}}</p>

  {{#if materials.length}}
  <h2>Materials Used</h2>
  <ul>
    {{#each materials}}
    <li>{{this.name}} - Qty: {{this.quantity}}</li>
    {{/each}}
  </ul>
  {{/if}}

  <h2>Signatures</h2>
  <p>Customer Signature: _______________________</p>
  <p>Technician Signature: _______________________</p>
  <p>Date: {{formatDate signedAt}}</p>
</body>
</html>
    `.trim();
  }
}

/**
 * PDF generation options
 */
export interface PdfGenerationOptions {
  title?: string;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  pageSize?: 'A4' | 'LETTER';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Contract PDF data structure
 */
export interface ContractPdfData {
  contractNumber: string;
  generatedAt: Date;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  };
  service: {
    name: string;
    type: string;
    description?: string;
    requestedStartDate?: Date;
    requestedEndDate?: Date;
  };
  provider?: {
    name: string;
    id?: string;
  };
  terms?: string;
  pricing?: {
    amount: number;
    currency: string;
    taxRate?: number;
  };
}

/**
 * WCF PDF data structure
 */
export interface WcfPdfData {
  wcfNumber: string;
  serviceOrderId: string;
  serviceDate: Date;
  customerInfo: {
    name: string;
    email?: string;
    phone?: string;
  };
  serviceLocation: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  providerInfo: {
    id?: string;
    name: string;
  };
  technicianInfo: {
    id?: string;
    name: string;
  };
  workSummary: string;
  workDetails: {
    description: string;
    tasksCompleted?: string[];
    issuesFound?: string[];
    issuesResolved?: string[];
  };
  materials?: Array<{
    name: string;
    quantity: number;
    unitPrice?: number;
  }>;
  labor?: Array<{
    technicianName: string;
    hours: number;
    rate?: number;
  }>;
  customerAccepted?: boolean;
  signedAt?: Date;
}
