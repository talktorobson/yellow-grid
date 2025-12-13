import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CamundaConfiguration {
  zeebeAddress: string;
  zeebeRestAddress: string;
  secureConnection: boolean;
  clientId?: string;
  clientSecret?: string;
  oauthUrl?: string;
  operateBaseUrl: string;
  tasklistBaseUrl: string;
  tenantId?: string;
  enabled: boolean;
}

@Injectable()
export class CamundaConfig {
  constructor(private readonly configService: ConfigService) {}

  get(): CamundaConfiguration {
    return {
      // Support both naming conventions for gateway address
      zeebeAddress:
        this.configService.get<string>('ZEEBE_GATEWAY_ADDRESS') ||
        this.configService.get<string>('ZEEBE_ADDRESS', 'localhost:26500'),
      zeebeRestAddress: this.configService.get<string>(
        'ZEEBE_REST_ADDRESS',
        'http://localhost:8080',
      ),
      secureConnection:
        !(this.configService.get<string>('ZEEBE_INSECURE', 'false') === 'true') &&
        this.configService.get<boolean>('CAMUNDA_SECURE_CONNECTION', false),
      clientId: this.configService.get<string>('ZEEBE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('ZEEBE_CLIENT_SECRET'),
      oauthUrl: this.configService.get<string>('CAMUNDA_OAUTH_URL'),
      operateBaseUrl:
        this.configService.get<string>('CAMUNDA_OPERATE_URL') ||
        this.configService.get<string>('CAMUNDA_OPERATE_BASE_URL', 'http://localhost:8081'),
      tasklistBaseUrl:
        this.configService.get<string>('CAMUNDA_TASKLIST_URL') ||
        this.configService.get<string>('CAMUNDA_TASKLIST_BASE_URL', 'http://localhost:8082'),
      tenantId: this.configService.get<string>('CAMUNDA_TENANT_ID'),
      enabled: this.configService.get<string>('CAMUNDA_ENABLED', 'false') === 'true',
    };
  }

  /**
   * Get SDK configuration object
   */
  getSdkConfig(): Record<string, any> {
    const config = this.get();

    const sdkConfig: Record<string, any> = {
      ZEEBE_ADDRESS: config.zeebeAddress,
      ZEEBE_REST_ADDRESS: config.zeebeRestAddress,
      CAMUNDA_SECURE_CONNECTION: config.secureConnection,
      CAMUNDA_OPERATE_BASE_URL: config.operateBaseUrl,
      CAMUNDA_TASKLIST_BASE_URL: config.tasklistBaseUrl,
    };

    if (config.clientId) {
      sdkConfig.ZEEBE_CLIENT_ID = config.clientId;
    }
    if (config.clientSecret) {
      sdkConfig.ZEEBE_CLIENT_SECRET = config.clientSecret;
    }
    if (config.oauthUrl) {
      sdkConfig.CAMUNDA_OAUTH_URL = config.oauthUrl;
      sdkConfig.CAMUNDA_AUTH_STRATEGY = 'OAUTH';
    }
    if (config.tenantId) {
      sdkConfig.CAMUNDA_TENANT_ID = config.tenantId;
    }

    return sdkConfig;
  }
}
