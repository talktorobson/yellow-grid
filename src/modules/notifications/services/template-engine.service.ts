import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface TemplateRenderOptions {
  templateCode: string;
  language: string;
  variables: Record<string, any>;
  countryCode?: string;
  businessUnit?: string;
}

export interface RenderedTemplate {
  subject?: string;
  body: string;
  shortMessage?: string;
}

@Injectable()
export class TemplateEngineService {
  private readonly logger = new Logger(TemplateEngineService.name);
  private readonly handlebars: typeof Handlebars;

  constructor(private readonly prisma: PrismaService) {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers for template rendering
   */
  private registerHelpers(): void {
    // Date formatting helper
    this.handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';

      const d = new Date(date);
      const options: Intl.DateTimeFormatOptions = {};

      switch (format) {
        case 'short':
          options.day = '2-digit';
          options.month = '2-digit';
          options.year = 'numeric';
          break;
        case 'long':
          options.day = 'numeric';
          options.month = 'long';
          options.year = 'numeric';
          break;
        case 'time':
          options.hour = '2-digit';
          options.minute = '2-digit';
          break;
        case 'datetime':
          options.day = '2-digit';
          options.month = '2-digit';
          options.year = 'numeric';
          options.hour = '2-digit';
          options.minute = '2-digit';
          break;
        default:
          return d.toLocaleDateString();
      }

      return d.toLocaleDateString('fr-FR', options);
    });

    // Currency formatting helper
    this.handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'EUR') => {
      if (typeof amount !== 'number') return '';

      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Conditional helper
    this.handlebars.registerHelper('eq', (a, b) => a === b);
    this.handlebars.registerHelper('ne', (a, b) => a !== b);
    this.handlebars.registerHelper('gt', (a, b) => a > b);
    this.handlebars.registerHelper('lt', (a, b) => a < b);

    // Uppercase/lowercase helpers
    this.handlebars.registerHelper('upper', (str: string) => (str ? str.toUpperCase() : ''));
    this.handlebars.registerHelper('lower', (str: string) => (str ? str.toLowerCase() : ''));

    this.logger.log('Handlebars helpers registered');
  }

  /**
   * Render a notification template with variables
   */
  async renderTemplate(options: TemplateRenderOptions): Promise<RenderedTemplate> {
    const { templateCode, language, variables, countryCode, businessUnit } = options;

    this.logger.log(`Rendering template: ${templateCode} for language: ${language}`);

    // Fetch template from database
    const template = await this.prisma.notificationTemplate.findFirst({
      where: {
        code: templateCode,
        isActive: true,
        OR: [{ countryCode: null }, { countryCode }],
        AND: [
          {
            OR: [{ businessUnit: null }, { businessUnit }],
          },
        ],
      },
      include: {
        translations: {
          where: {
            language,
          },
        },
      },
      orderBy: [
        { countryCode: 'desc' }, // Prefer country-specific templates
        { businessUnit: 'desc' }, // Then BU-specific templates
      ],
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${templateCode} for language: ${language}`);
    }

    // Get translation (fallback to 'en' if not found)
    let translation = template.translations[0];

    if (!translation) {
      this.logger.warn(`Translation not found for language: ${language}, falling back to 'en'`);

      const fallbackTranslation = await this.prisma.notificationTranslation.findFirst({
        where: {
          templateId: template.id,
          language: 'en',
        },
      });

      if (!fallbackTranslation) {
        throw new NotFoundException(`No translation found for template: ${templateCode}`);
      }

      translation = fallbackTranslation;
    }

    // Compile and render templates
    const bodyTemplate = this.handlebars.compile(translation.bodyTemplate);
    const body = bodyTemplate(variables);

    const rendered: RenderedTemplate = {
      body,
    };

    if (translation.subject) {
      const subjectTemplate = this.handlebars.compile(translation.subject);
      rendered.subject = subjectTemplate(variables);
    }

    if (translation.shortMessage) {
      const shortMessageTemplate = this.handlebars.compile(translation.shortMessage);
      rendered.shortMessage = shortMessageTemplate(variables);
    }

    this.logger.log(`Template rendered successfully: ${templateCode} (${language})`);

    return rendered;
  }

  /**
   * Validate template syntax without rendering
   */
  validateTemplate(templateString: string): { valid: boolean; error?: string } {
    try {
      this.handlebars.compile(templateString);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    templateCode: string,
    language: string,
    sampleVariables: Record<string, any>,
  ): Promise<RenderedTemplate> {
    return this.renderTemplate({
      templateCode,
      language,
      variables: sampleVariables,
    });
  }
}
