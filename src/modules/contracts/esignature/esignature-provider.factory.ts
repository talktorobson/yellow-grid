import { Injectable, Logger } from '@nestjs/common';
import { IESignatureProvider } from './interfaces/esignature-provider.interface';
import { ESignatureConfig, ESignatureProviderType } from './config/esignature.config';
import { DocuSignProvider } from './providers/docusign.provider';
import { AdobeSignProvider } from './providers/adobe-sign.provider';
import { MockESignatureProvider } from './providers/mock.provider';

/**
 * E-Signature Provider Factory
 *
 * Creates and manages e-signature provider instances based on configuration.
 * Implements the Factory pattern to abstract provider creation.
 */
@Injectable()
export class ESignatureProviderFactory {
  private readonly logger = new Logger(ESignatureProviderFactory.name);
  private providerInstance: IESignatureProvider | null = null;
  private currentProviderType: ESignatureProviderType | null = null;

  constructor(private readonly config: ESignatureConfig) {}

  /**
   * Get the configured e-signature provider instance.
   * Creates the provider on first call and caches it.
   *
   * @returns The configured e-signature provider
   */
  getProvider(): IESignatureProvider {
    const providerType = this.config.getProvider();

    // Return cached instance if provider type hasn't changed
    if (this.providerInstance && this.currentProviderType === providerType) {
      return this.providerInstance;
    }

    // Create new provider instance
    this.logger.log(`Creating e-signature provider: ${providerType}`);
    this.providerInstance = this.createProvider(providerType);
    this.currentProviderType = providerType;

    return this.providerInstance;
  }

  /**
   * Force refresh of the provider instance.
   * Useful when configuration changes at runtime.
   */
  refreshProvider(): IESignatureProvider {
    this.logger.log('Forcing refresh of e-signature provider');
    this.providerInstance = null;
    this.currentProviderType = null;
    return this.getProvider();
  }

  /**
   * Get a specific provider by type (useful for testing)
   */
  getProviderByType(type: ESignatureProviderType): IESignatureProvider {
    this.logger.debug(`Creating specific provider: ${type}`);
    return this.createProvider(type);
  }

  /**
   * Check if a specific provider type is available (credentials configured)
   */
  isProviderAvailable(type: ESignatureProviderType): boolean {
    try {
      if (type === 'mock') {
        return true; // Mock provider always available
      }

      if (type === 'docusign') {
        const config = this.config.getDocuSignConfig();
        return !!(config.integrationKey && config.userId && config.accountId && config.privateKey);
      }

      if (type === 'adobe-sign') {
        const config = this.config.getAdobeSignConfig();
        return !!(config.integrationKey && config.clientId && config.clientSecret);
      }

      return false;
    } catch (error) {
      this.logger.warn(`Provider ${type} not available: ${error.message}`);
      return false;
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): ESignatureProviderType[] {
    const providers: ESignatureProviderType[] = [];

    if (this.isProviderAvailable('mock')) {
      providers.push('mock');
    }
    if (this.isProviderAvailable('docusign')) {
      providers.push('docusign');
    }
    if (this.isProviderAvailable('adobe-sign')) {
      providers.push('adobe-sign');
    }

    return providers;
  }

  /**
   * Health check for current provider
   */
  async healthCheck() {
    try {
      const provider = this.getProvider();
      return await provider.healthCheck();
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private createProvider(type: ESignatureProviderType): IESignatureProvider {
    switch (type) {
      case 'docusign':
        return this.createDocuSignProvider();

      case 'adobe-sign':
        return this.createAdobeSignProvider();

      case 'mock':
        return this.createMockProvider();

      default:
        throw new Error(`Unknown e-signature provider type: ${type}`);
    }
  }

  private createDocuSignProvider(): IESignatureProvider {
    try {
      const config = this.config.getDocuSignConfig();
      this.logger.log('Creating DocuSign provider instance');
      return new DocuSignProvider(config);
    } catch (error) {
      this.logger.error('Failed to create DocuSign provider', error.stack);
      throw new Error(
        `Failed to create DocuSign provider: ${error.message}. ` +
          'Ensure DOCUSIGN_* environment variables are properly configured.',
      );
    }
  }

  private createAdobeSignProvider(): IESignatureProvider {
    try {
      const config = this.config.getAdobeSignConfig();
      this.logger.log('Creating Adobe Sign provider instance');
      return new AdobeSignProvider(config);
    } catch (error) {
      this.logger.error('Failed to create Adobe Sign provider', error.stack);
      throw new Error(
        `Failed to create Adobe Sign provider: ${error.message}. ` +
          'Ensure ADOBE_SIGN_* environment variables are properly configured.',
      );
    }
  }

  private createMockProvider(): IESignatureProvider {
    this.logger.log('Creating Mock provider instance');
    return new MockESignatureProvider();
  }
}
