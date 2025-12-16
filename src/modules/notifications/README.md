# Notifications Module

Comprehensive notification system for the Yellow Grid Platform supporting multi-channel delivery (Email, SMS, Push), multi-language templates, and user preferences.

## Features

✅ **Multi-Channel Support**
- Email notifications via SendGrid
- SMS notifications via Twilio
- Push notifications (TODO: Firebase Cloud Messaging)

✅ **Multi-Language Templates**
- Support for ES, FR, IT, PL languages
- Handlebars-based template engine
- Template inheritance and reusability

✅ **User Preferences**
- Opt-in/opt-out per channel
- Event-specific preferences
- Quiet hours support with timezone awareness

✅ **Event-Driven Architecture**
- Kafka event handlers for domain events
- Automatic notification triggering
- Retry mechanism for failed deliveries

✅ **Delivery Tracking**
- Webhook integration for delivery status
- Read receipts and click tracking
- Comprehensive audit trail

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Notification Module                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Twilio     │  │   SendGrid   │  │     FCM      │  │
│  │   Provider   │  │   Provider   │  │   Provider   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│          │                 │                  │          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          Notifications Service                     │  │
│  └───────────────────────────────────────────────────┘  │
│          │                                               │
│  ┌───────────────────┐     ┌─────────────────────────┐ │
│  │ Template Engine   │     │  Preferences Service    │ │
│  │   (Handlebars)    │     │   (Opt-in/Opt-out)      │ │
│  └───────────────────┘     └─────────────────────────┘ │
│          │                                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Event Handler Service                     │  │
│  │  (Order Assigned, Check-in, WCF Ready, etc.)     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### NotificationTemplate
- Template definitions with multi-language support
- Country/BU specific templates
- Retry configuration

### NotificationTranslation
- Language-specific template content
- Subject, body, and short message variants

### NotificationPreference
- User-specific channel preferences
- Event-specific notification settings
- Quiet hours configuration

### Notification
- Notification log with delivery tracking
- Provider message IDs
- Retry tracking

### NotificationWebhook
- Webhook event logging
- Asynchronous processing queue

## API Endpoints

### Send Notification
```http
POST /api/v1/notifications
Content-Type: application/json

{
  "templateCode": "ORDER_ASSIGNED",
  "recipientId": "user-123",
  "recipientEmail": "user@example.com",
  "channel": "EMAIL",
  "eventType": "order.assigned",
  "language": "es",
  "variables": {
    "orderNumber": "ORD-12345",
    "providerName": "ABC Services",
    "scheduledDate": "2025-01-20"
  },
  "contextType": "service_order",
  "contextId": "order-123",
  "countryCode": "ES",
  "businessUnit": "LM_ES"
}
```

### Get User Notifications
```http
GET /api/v1/notifications/user/:userId?channel=EMAIL&status=SENT&limit=20
```

### Update Notification Preferences
```http
PUT /api/v1/notifications/preferences/:userId
Content-Type: application/json

{
  "emailEnabled": true,
  "smsEnabled": false,
  "pushEnabled": true,
  "eventPreferences": {
    "order.assigned": {
      "email": true,
      "sms": true,
      "push": false
    }
  },
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00",
  "quietHoursTimezone": "Europe/Paris"
}
```

### Opt Out/In
```http
POST /api/v1/notifications/preferences/:userId/opt-out/EMAIL
POST /api/v1/notifications/preferences/:userId/opt-in/SMS
```

## Environment Variables

Add the following to your `.env` file:

```env
# Twilio SMS Configuration
TWILIO_ENABLED=true
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15555555555

# SendGrid Email Configuration
SENDGRID_ENABLED=true
SENDGRID_API_KEY=SG.your_api_key
SENDGRID_FROM_EMAIL=noreply@yellowgrid.com
SENDGRID_FROM_NAME=Yellow Grid Platform

# Push Notifications (TODO)
FCM_ENABLED=false
FCM_SERVER_KEY=your_fcm_server_key
```

## Template Examples

### Email Template (ES - Spanish)
```handlebars
<h1>Orden Asignada</h1>
<p>Hola {{providerName}},</p>

<p>Se le ha asignado una nueva orden de servicio:</p>

<ul>
  <li><strong>Número de Orden:</strong> {{orderNumber}}</li>
  <li><strong>Tipo de Servicio:</strong> {{serviceType}}</li>
  <li><strong>Fecha Programada:</strong> {{formatDate scheduledDate 'long'}}</li>
  <li><strong>Cliente:</strong> {{customerName}}</li>
  <li><strong>Dirección:</strong> {{customerAddress}}</li>
</ul>

<p>Por favor, revise los detalles y confirme su disponibilidad.</p>
```

### SMS Template (ES - Spanish)
```handlebars
Orden {{orderNumber}} asignada para {{formatDate scheduledDate 'short'}}. Cliente: {{customerName}}
```

### Template with Conditional Logic
```handlebars
<p>Su orden {{orderNumber}} está {{#eq status 'completed'}}completada{{else}}en progreso{{/eq}}.</p>

{{#if wcfLink}}
<p><a href="{{wcfLink}}">Revise y firme el formulario de cierre</a></p>
{{/if}}
```

## Usage

### Programmatic Sending

```typescript
import { NotificationsService } from '@/modules/notifications/services/notifications.service';

// Inject service
constructor(private readonly notificationsService: NotificationsService) {}

// Send notification
await this.notificationsService.sendNotification({
  templateCode: 'ORDER_ASSIGNED',
  recipientEmail: 'provider@example.com',
  channel: 'EMAIL',
  eventType: 'order.assigned',
  language: 'es',
  variables: {
    orderNumber: 'ORD-12345',
    providerName: 'ABC Services',
    scheduledDate: new Date(),
  },
  contextType: 'service_order',
  contextId: 'order-123',
  countryCode: 'ES',
});
```

### Event-Based Sending

The notification module listens to Kafka events and automatically sends notifications:

```typescript
// When an order is assigned, publish event
await this.kafka.publish('assignments.assignment.confirmed', {
  orderId: 'order-123',
  orderNumber: 'ORD-12345',
  providerId: 'provider-123',
  providerEmail: 'provider@example.com',
  providerPhone: '+34612345678',
  providerName: 'ABC Services',
  serviceType: 'Installation',
  scheduledDate: '2025-01-20',
  customerName: 'John Doe',
  customerAddress: '123 Main St',
  countryCode: 'ES',
  businessUnit: 'LM_ES',
  language: 'es',
});

// Notification handler automatically sends email and SMS
```

## Supported Event Types

| Event Type | Trigger | Recipients |
|-----------|---------|------------|
| `order.assigned` | Service order assigned to provider | Provider |
| `execution.checkin` | Technician checks in | Customer |
| `execution.checkout` | Service completed | Customer, Provider |
| `wcf.ready` | Work Closing Form ready for signature | Customer |
| `contract.ready` | Contract ready for signature | Customer |
| `order.cancelled` | Service order cancelled | Provider, Customer |

## Testing

```bash
# Run unit tests
npm test -- notifications.service.spec.ts

# Run all notification tests
npm test -- notifications

# Test coverage
npm run test:cov -- notifications
```

## Webhook Configuration

### Twilio
Configure webhook URL in Twilio console:
```
https://your-domain.com/api/v1/notifications/webhooks/twilio
```

### SendGrid
Configure Event Webhook in SendGrid:
```
https://your-domain.com/api/v1/notifications/webhooks/sendgrid
```

Enable these events:
- Delivered
- Bounce
- Open
- Click
- Dropped

## Best Practices

1. **Template Management**
   - Keep templates version-controlled
   - Test templates in all languages
   - Use template preview before production

2. **User Preferences**
   - Always check preferences before sending
   - Respect quiet hours
   - Provide easy opt-out mechanisms

3. **Error Handling**
   - Log all failed notifications
   - Implement retry logic with exponential backoff
   - Monitor delivery rates

4. **Performance**
   - Use bulk sending for multiple recipients
   - Cache frequently used templates
   - Async processing for non-critical notifications

5. **Compliance**
   - GDPR: Respect user preferences and consent
   - CAN-SPAM: Include unsubscribe links in emails
   - SMS regulations: Follow local telecom regulations

## Monitoring

Key metrics to track:
- Notification send rate
- Delivery success rate
- Bounce rate
- Open rate (email)
- Click rate (email)
- Average delivery time
- Failed notification count

## Troubleshooting

### Notifications not being sent
1. Check environment variables are configured
2. Verify provider credentials
3. Check user notification preferences
4. Review logs for errors

### Template rendering errors
1. Validate template syntax
2. Ensure all required variables are provided
3. Check template exists for the language

### Delivery failures
1. Verify recipient email/phone is valid
2. Check provider status (Twilio, SendGrid)
3. Review webhook logs for delivery status

## Future Enhancements

- [ ] Firebase Cloud Messaging for push notifications
- [ ] A/B testing for templates
- [ ] Analytics dashboard
- [ ] Smart send time optimization
- [ ] Template editor UI
- [ ] Notification scheduling
- [ ] Rate limiting per user

## References

- [Twilio API Documentation](https://www.twilio.com/docs/sms)
- [SendGrid API Documentation](https://docs.sendgrid.com/)
- [Handlebars Documentation](https://handlebarsjs.com/)
- [Product Docs: Communication & Notifications](/documentation/architecture/03-service-boundaries.md#7-communication--notifications-service)
