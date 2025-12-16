# E-Signature Integration

Flexible, vendor-agnostic e-signature integration for the Yellow Grid Field Service Management platform.

## Features

- **Provider-Agnostic Architecture**: Easily switch between DocuSign, Adobe Sign, or add new providers
- **No Vendor Lock-in**: Abstract interface allows seamless provider migration
- **Automatic Retry Logic**: Exponential backoff with jitter for transient failures
- **Webhook Support**: Real-time signature status updates
- **Mock Provider**: Built-in mock provider for testing and development
- **Comprehensive Error Handling**: Detailed error codes and messages
- **Production-Ready**: JWT authentication, rate limiting handling, secure webhooks

## Supported Providers

| Provider | Status | Authentication | Features |
|----------|--------|----------------|----------|
| **DocuSign** | ✅ Implemented | JWT | Full API support, webhooks, document download |
| **Adobe Sign** | ✅ Implemented | OAuth 2.0 | Full API support, webhooks, document download |
| **Mock** | ✅ Implemented | None | Testing and development |

## Architecture

```
┌──────────────────────────┐
│   ContractsService       │
│   (Business Logic)       │
└────────────┬─────────────┘
             │ uses
             ▼
┌──────────────────────────┐
│   ESignatureService      │
│   (Retry Logic)          │
└────────────┬─────────────┘
             │ uses
             ▼
┌──────────────────────────┐
│ ESignatureProviderFactory│
│ (Provider Selection)     │
└────────────┬─────────────┘
             │ creates
             ▼
┌──────────────────────────┐
│  IESignatureProvider     │
│  (Abstract Interface)    │
└────────────┬─────────────┘
             │
     ┌───────┴────────┬──────────┐
     ▼                ▼          ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│DocuSign │  │AdobeSign │  │   Mock   │
│Provider │  │Provider  │  │Provider  │
└─────────┘  └──────────┘  └──────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install axios jsonwebtoken
npm install @types/jsonwebtoken --save-dev
```

### 2. Configure Environment Variables

Choose your provider and configure the appropriate environment variables.

#### Option A: DocuSign

```bash
# E-Signature Provider Selection
ESIGNATURE_PROVIDER=docusign

# DocuSign Configuration
DOCUSIGN_INTEGRATION_KEY=your-integration-key-here
DOCUSIGN_USER_ID=your-user-guid-here
DOCUSIGN_ACCOUNT_ID=your-account-id-here
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYour Private Key Here\n-----END RSA PRIVATE KEY-----"
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_OAUTH_BASE_PATH=https://account-d.docusign.com
DOCUSIGN_WEBHOOK_SECRET=your-webhook-secret-here
```

#### Option B: Adobe Sign

```bash
# E-Signature Provider Selection
ESIGNATURE_PROVIDER=adobe-sign

# Adobe Sign Configuration
ADOBE_SIGN_INTEGRATION_KEY=your-integration-key-here
ADOBE_SIGN_CLIENT_ID=your-client-id-here
ADOBE_SIGN_CLIENT_SECRET=your-client-secret-here
ADOBE_SIGN_API_ACCESS_POINT=https://api.na1.adobesign.com/api/rest/v6
ADOBE_SIGN_WEBHOOK_SECRET=your-webhook-secret-here
```

#### Option C: Mock (Testing/Development)

```bash
# E-Signature Provider Selection
ESIGNATURE_PROVIDER=mock

# No additional configuration needed!
```

### 3. Update Prisma Schema

Add the `providerEnvelopeId` field to the `Contract` model:

```prisma
model Contract {
  id                    String          @id @default(uuid())
  // ... existing fields ...

  // E-Signature Integration
  providerEnvelopeId    String?         // Envelope ID from e-signature provider
  signedDocumentUrl     String?         // URL to signed document
  signedDocumentChecksum String?        // Checksum of signed document

  // ... rest of fields ...
}
```

Then run:

```bash
npx prisma generate
npx prisma migrate dev --name add_provider_envelope_id
```

### 4. Configure Webhooks

#### DocuSign Webhook Setup

1. Go to DocuSign Admin Console → Connect → Custom
2. Click "Add Configuration"
3. Enter webhook URL: `https://your-domain.com/api/v1/webhooks/esignature`
4. Select events: All envelope events, All recipient events
5. Include HMAC signature: Yes
6. Save the webhook secret in `DOCUSIGN_WEBHOOK_SECRET`

#### Adobe Sign Webhook Setup

1. Go to Adobe Sign → Account → Webhooks
2. Create webhook
3. URL: `https://your-domain.com/api/v1/webhooks/esignature/adobe-sign`
4. Events: Select all agreement events
5. Save the client ID for verification

### 5. Test the Integration

```typescript
import { ESignatureService } from './modules/contracts/esignature/esignature.service';

// Health check
const health = await eSignatureService.healthCheck();
console.log('Provider status:', health.status);

// Get provider info
const info = eSignatureService.getProviderInfo();
console.log('Active provider:', info.providerId);
console.log('Available providers:', info.availableProviders);
```

## Usage Examples

### Sending a Contract for Signature

The `ContractsService` automatically uses the e-signature provider when sending contracts:

```typescript
// Send contract via e-signature provider
const contract = await contractsService.send(contractId, {
  email: 'customer@example.com',
  phone: '+15551234567', // Optional, for SMS verification
  message: 'Please sign your service contract',
  expiresInHours: 48,
});
```

### Checking Envelope Status

```typescript
const status = await eSignatureService.getEnvelopeStatus(envelopeId);

console.log('Envelope status:', status.status);
console.log('Signers:', status.signers);
console.log('Created at:', status.createdAt);
console.log('Completed at:', status.completedAt);
```

### Downloading Signed Document

```typescript
const document = await eSignatureService.downloadSignedDocument(envelopeId);

// Save to file system or cloud storage
const buffer = Buffer.from(document.content, 'base64');
await fs.writeFile(`signed-${document.fileName}`, buffer);

console.log('File size:', document.fileSize);
console.log('Checksum:', document.checksum);
```

### Voiding an Envelope

```typescript
const result = await eSignatureService.voidEnvelope(
  envelopeId,
  'Customer requested cancellation'
);

console.log('Voided at:', result.voidedAt);
```

## Configuration Options

All configuration is done via environment variables. See `ESignatureConfig` for all options.

### General Settings

```bash
# Default envelope expiration in days
ESIGNATURE_DEFAULT_EXPIRATION_DAYS=14

# Enable automatic reminders
ESIGNATURE_ENABLE_REMINDERS=true

# Reminder frequency in days
ESIGNATURE_REMINDER_FREQUENCY_DAYS=3

# Maximum retry attempts for failed requests
ESIGNATURE_MAX_RETRIES=3

# Delay between retries in milliseconds
ESIGNATURE_RETRY_DELAY_MS=1000

# Request timeout in milliseconds
ESIGNATURE_REQUEST_TIMEOUT_MS=30000

# Enable webhook processing
ESIGNATURE_WEBHOOK_ENABLED=true
```

## Provider Comparison

| Feature | DocuSign | Adobe Sign | Mock |
|---------|----------|------------|------|
| **Authentication** | JWT (RSA) | OAuth 2.0 | None |
| **Webhook Signature** | HMAC SHA-256 | Client ID | None |
| **Max File Size** | 25 MB | 100 MB | Unlimited |
| **Signer Authentication** | Email, SMS, ID, KBA | Phone, Email | None |
| **Pricing** | ~$10/user/mo | ~$15/user/mo | Free |
| **Best For** | Enterprise | Creative/Marketing | Testing |

## Switching Providers

Switching providers is as simple as changing one environment variable:

```bash
# Change from DocuSign to Adobe Sign
ESIGNATURE_PROVIDER=adobe-sign  # was: docusign
```

**No code changes required!** The abstract interface ensures all providers work identically.

### Migration Checklist

- [ ] Update `ESIGNATURE_PROVIDER` environment variable
- [ ] Configure new provider credentials
- [ ] Set up new provider webhooks
- [ ] Test with a sample contract
- [ ] Monitor logs for any issues
- [ ] Update any provider-specific documentation

## Webhook Events

The webhook controller automatically processes these events:

| Event | Description | Updates |
|-------|-------------|---------|
| `ENVELOPE_SENT` | Envelope sent to signers | Contract status → SENT |
| `ENVELOPE_DELIVERED` | Signer viewed envelope | Logged |
| `ENVELOPE_COMPLETED` | All signers signed | Contract status → SIGNED, download document |
| `ENVELOPE_DECLINED` | Signer declined | Contract status → CANCELLED |
| `ENVELOPE_VOIDED` | Envelope voided | Contract status → CANCELLED |
| `RECIPIENT_SENT` | Recipient notified | Signature status → REQUESTED |
| `RECIPIENT_DELIVERED` | Recipient viewed | Logged |
| `RECIPIENT_SIGNED` | Recipient signed | Signature status → SIGNED |
| `RECIPIENT_DECLINED` | Recipient declined | Logged |
| `RECIPIENT_AUTH_FAILED` | Auth failed | Logged, alert sent |

## Error Handling

All errors throw `ESignatureProviderError` with detailed error codes:

```typescript
try {
  await eSignatureService.createEnvelope(request);
} catch (error) {
  if (error instanceof ESignatureProviderError) {
    console.error('Provider:', error.provider);
    console.error('Error code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
  }
}
```

### Error Codes

- **Configuration**: `INVALID_CONFIGURATION`, `MISSING_CREDENTIALS`
- **Request**: `INVALID_REQUEST`, `INVALID_DOCUMENT`, `INVALID_SIGNER`
- **Operation**: `ENVELOPE_NOT_FOUND`, `ENVELOPE_ALREADY_SENT`, `ENVELOPE_EXPIRED`
- **Auth**: `AUTHENTICATION_FAILED`, `AUTHORIZATION_FAILED`, `TOKEN_EXPIRED`
- **Rate Limiting**: `RATE_LIMIT_EXCEEDED`
- **Network**: `NETWORK_ERROR`, `TIMEOUT_ERROR`
- **Provider**: `PROVIDER_ERROR`, `PROVIDER_UNAVAILABLE`
- **Webhook**: `WEBHOOK_SIGNATURE_INVALID`, `WEBHOOK_PROCESSING_ERROR`

### Retryable Errors

The service automatically retries these errors with exponential backoff:

- `NETWORK_ERROR`
- `TIMEOUT_ERROR`
- `RATE_LIMIT_EXCEEDED`
- `PROVIDER_UNAVAILABLE`
- `TOKEN_EXPIRED`

## Testing

### Using the Mock Provider

The Mock provider is perfect for testing without external dependencies:

```typescript
// In test files or development
process.env.ESIGNATURE_PROVIDER = 'mock';

const mockProvider = providerFactory.getProviderByType('mock') as MockESignatureProvider;

// Simulate signing
mockProvider.simulateSign(envelopeId, 'customer@example.com', '192.168.1.1');

// Simulate decline
mockProvider.simulateDecline(envelopeId, 'customer@example.com', 'Changed my mind');

// Check envelope
const envelope = mockProvider.getEnvelope(envelopeId);
expect(envelope.status).toBe(EnvelopeStatus.COMPLETED);
```

### Unit Tests

See `esignature.service.spec.ts` and provider-specific test files.

### Integration Tests

See `esignature-integration.spec.ts` for end-to-end integration tests.

## Production Considerations

### Security

1. **Private Keys**: Store DocuSign private key securely (AWS Secrets Manager, Azure Key Vault)
2. **Webhook Secrets**: Always validate webhook signatures
3. **HTTPS**: Use HTTPS for all webhook endpoints
4. **Rate Limiting**: Monitor and handle rate limits gracefully

### Performance

1. **Async Processing**: Consider processing webhooks via message queue for high volume
2. **Caching**: Cache access tokens until expiration
3. **Connection Pooling**: Use HTTP connection pooling for better performance
4. **Monitoring**: Monitor provider latency and availability

### Reliability

1. **Retry Logic**: Automatic exponential backoff retry for transient failures
2. **Fallback**: Falls back to legacy mode if e-signature provider unavailable
3. **Health Checks**: Regular health checks to detect provider issues
4. **Logging**: Comprehensive logging for debugging and auditing

### Compliance

1. **E-SIGN Act**: All providers comply with US E-SIGN Act
2. **GDPR**: Customer consent required for signature requests
3. **Data Retention**: Configure document retention policies
4. **Audit Trail**: Complete audit trail maintained by providers

## Troubleshooting

### Common Issues

#### "Authentication failed" Error

**DocuSign**:
- Verify `DOCUSIGN_PRIVATE_KEY` is correctly formatted (with `\n` for line breaks)
- Ensure `DOCUSIGN_USER_ID` is the User GUID, not email
- Check that JWT app has `impersonation` scope

**Adobe Sign**:
- Verify `ADOBE_SIGN_CLIENT_ID` and `ADOBE_SIGN_CLIENT_SECRET`
- Ensure OAuth app has correct scopes: `agreement_write:account`, `agreement_read:account`

#### Webhooks Not Received

1. Check webhook URL is publicly accessible
2. Verify webhook configuration in provider console
3. Check webhook secret matches environment variable
4. Look for signature validation errors in logs

#### "Envelope not found" Error

- Envelope ID may be from different provider account
- Envelope may have been deleted
- Provider account ID mismatch

### Debug Mode

Enable detailed logging:

```typescript
// In development
process.env.LOG_LEVEL = 'debug';
```

## Extending the Integration

### Adding a New Provider

1. Create provider class implementing `IESignatureProvider`
2. Add provider configuration to `ESignatureConfig`
3. Update `ESignatureProviderFactory` to create new provider
4. Add provider type to `ESignatureProviderType`
5. Implement all required methods
6. Add unit tests
7. Update documentation

Example:

```typescript
// providers/hellosign.provider.ts
export class HelloSignProvider implements IESignatureProvider {
  readonly providerId = 'hellosign';
  readonly version = '1.0.0';

  // Implement all interface methods...
}
```

## API Reference

See TypeScript interfaces in:
- `interfaces/esignature-provider.interface.ts` - Core interfaces
- `esignature.service.ts` - Service API
- `config/esignature.config.ts` - Configuration

## Support

- **Issues**: Report bugs at [GitHub Issues](https://github.com/your-org/yellow-grid/issues)
- **Documentation**: See `documentation/domain/07-contract-document-lifecycle.md`
- **Provider Docs**:
  - [DocuSign API](https://developers.docusign.com/)
  - [Adobe Sign API](https://secure.adobesign.com/public/docs/restapi/v6)

## License

Copyright © 2025 Yellow Grid Platform. All rights reserved.
