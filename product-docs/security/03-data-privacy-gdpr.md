# Data Privacy & GDPR Compliance

## Overview

This document outlines the data privacy framework and GDPR (General Data Protection Regulation) compliance measures, including data subject rights implementation, data minimization principles, consent management, and cross-border data transfer safeguards.

## GDPR Compliance Framework

### Regulatory Scope

**GDPR Applicability**
- Applies to processing of personal data of EU residents
- Applies regardless of organization location
- Covers automated and manual processing
- Includes data controllers and processors

**Key Definitions**
- **Personal Data**: Information relating to an identified or identifiable person
- **Processing**: Any operation on personal data (collection, storage, use, disclosure, deletion)
- **Data Controller**: Entity that determines purposes and means of processing
- **Data Processor**: Entity that processes data on behalf of controller
- **Data Subject**: Individual whose personal data is being processed

### Legal Basis for Processing

All data processing must have a lawful basis:

1. **Consent**: Freely given, specific, informed, and unambiguous
2. **Contract**: Processing necessary for contract performance
3. **Legal Obligation**: Required by law
4. **Vital Interests**: Protect life or safety
5. **Public Interest**: Official authority or public interest task
6. **Legitimate Interest**: Balancing test with data subject rights

## Data Subject Rights

### Right to Access (Article 15)

**Description**: Individuals can request access to their personal data

**Implementation**:
```typescript
/**
 * Data Subject Access Request (DSAR) Handler
 */
export async function handleAccessRequest(
  userId: string,
  requestId: string
): Promise<DataExportPackage> {
  // Log the request
  await auditLog.record({
    action: 'dsar_access_request',
    userId,
    requestId,
    timestamp: new Date()
  });

  // Collect all personal data
  const userData = await collectUserData(userId);

  // Generate export package
  const exportPackage: DataExportPackage = {
    requestId,
    userId,
    generatedAt: new Date(),
    data: {
      profile: userData.profile,
      preferences: userData.preferences,
      activityHistory: userData.activityHistory,
      consents: userData.consents,
      communications: userData.communications
    },
    metadata: {
      dataController: 'Your Company Name',
      dataProtectionOfficer: 'dpo@yourcompany.com',
      retentionPeriod: userData.retentionPolicies
    }
  };

  // Deliver within 30 days (GDPR requirement)
  await deliverExportPackage(userId, exportPackage);

  return exportPackage;
}

async function collectUserData(userId: string): Promise<UserDataCollection> {
  return {
    profile: await db.query('SELECT * FROM users WHERE id = $1', [userId]),
    preferences: await db.query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]),
    activityHistory: await db.query('SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY timestamp DESC', [userId]),
    consents: await db.query('SELECT * FROM user_consents WHERE user_id = $1', [userId]),
    communications: await db.query('SELECT * FROM communications WHERE user_id = $1', [userId])
  };
}
```

**Response Time**: 30 days (extendable by 2 months for complex requests)

**Free of Charge**: First request free, reasonable fee for additional requests

---

### Right to Rectification (Article 16)

**Description**: Individuals can correct inaccurate personal data

**Implementation**:
```typescript
/**
 * Data Rectification Handler
 */
export async function handleRectificationRequest(
  userId: string,
  corrections: DataCorrections
): Promise<RectificationResult> {
  // Validate corrections
  const validationResult = await validateCorrections(corrections);
  if (!validationResult.valid) {
    throw new ValidationError(validationResult.errors);
  }

  // Log the request
  await auditLog.record({
    action: 'dsar_rectification_request',
    userId,
    corrections,
    timestamp: new Date()
  });

  // Apply corrections
  const result = await db.transaction(async (tx) => {
    const updates: UpdateResult[] = [];

    if (corrections.profile) {
      const profileUpdate = await tx.query(
        'UPDATE users SET email = $1, name = $2, updated_at = NOW() WHERE id = $3',
        [corrections.profile.email, corrections.profile.name, userId]
      );
      updates.push({ table: 'users', rowsAffected: profileUpdate.rowCount });
    }

    if (corrections.preferences) {
      const prefsUpdate = await tx.query(
        'UPDATE user_preferences SET preferences = $1 WHERE user_id = $2',
        [corrections.preferences, userId]
      );
      updates.push({ table: 'user_preferences', rowsAffected: prefsUpdate.rowCount });
    }

    return updates;
  });

  // Notify user
  await notificationService.send(userId, {
    type: 'data_rectification_completed',
    message: 'Your personal data has been updated as requested.'
  });

  return {
    success: true,
    updates: result,
    completedAt: new Date()
  };
}
```

---

### Right to Erasure / "Right to be Forgotten" (Article 17)

**Description**: Individuals can request deletion of their personal data

**Conditions for Erasure**:
- Data no longer necessary for original purpose
- Consent withdrawn and no other legal basis
- Data processed unlawfully
- Legal obligation to erase
- Objection to processing (no overriding legitimate grounds)

**Exceptions** (when deletion can be refused):
- Legal compliance requirements
- Public interest (public health, scientific research)
- Legal claims defense
- Freedom of expression

**Implementation**:
```typescript
/**
 * Right to Erasure Handler
 */
export async function handleErasureRequest(
  userId: string,
  requestId: string,
  reason: ErasureReason
): Promise<ErasureResult> {
  // Verify eligibility for erasure
  const eligibility = await checkErasureEligibility(userId, reason);

  if (!eligibility.eligible) {
    return {
      success: false,
      reason: eligibility.reason,
      message: 'Erasure request denied due to legal obligations'
    };
  }

  // Log the request
  await auditLog.record({
    action: 'dsar_erasure_request',
    userId,
    requestId,
    reason,
    timestamp: new Date()
  });

  // Perform erasure (anonymization + deletion)
  const erasureResult = await performErasure(userId);

  // Retain minimal audit trail (legal requirement)
  await retainAuditTrail(userId, requestId, 'erasure_completed');

  return erasureResult;
}

/**
 * Perform data erasure (anonymization + deletion)
 */
async function performErasure(userId: string): Promise<ErasureResult> {
  return await db.transaction(async (tx) => {
    // Step 1: Anonymize data that must be retained for legal/business reasons
    await tx.query(`
      UPDATE transactions
      SET user_id = NULL,
          user_email = 'anonymized@example.com',
          user_name = 'Anonymized User'
      WHERE user_id = $1
    `, [userId]);

    // Step 2: Delete personal data
    const deletions = [];

    // Delete user profile
    const userDelete = await tx.query('DELETE FROM users WHERE id = $1', [userId]);
    deletions.push({ table: 'users', rowsDeleted: userDelete.rowCount });

    // Delete preferences
    const prefsDelete = await tx.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    deletions.push({ table: 'user_preferences', rowsDeleted: prefsDelete.rowCount });

    // Delete activity logs (older than retention period)
    const logsDelete = await tx.query(`
      DELETE FROM activity_logs
      WHERE user_id = $1
        AND timestamp < NOW() - INTERVAL '6 months'
    `, [userId]);
    deletions.push({ table: 'activity_logs', rowsDeleted: logsDelete.rowCount });

    // Delete uploaded files
    await deleteUserFiles(userId);

    // Delete from third-party services
    await notifyThirdPartyProcessors(userId, 'erasure');

    return {
      success: true,
      deletions,
      completedAt: new Date()
    };
  });
}

/**
 * Check if user is eligible for erasure
 */
async function checkErasureEligibility(
  userId: string,
  reason: ErasureReason
): Promise<EligibilityResult> {
  // Check for active legal obligations
  const activeContracts = await db.query(
    'SELECT COUNT(*) FROM contracts WHERE user_id = $1 AND status = $2',
    [userId, 'active']
  );

  if (activeContracts.rows[0].count > 0) {
    return {
      eligible: false,
      reason: 'Active contracts exist - data required for contract performance'
    };
  }

  // Check for pending legal claims
  const legalClaims = await db.query(
    'SELECT COUNT(*) FROM legal_claims WHERE user_id = $1 AND status != $2',
    [userId, 'resolved']
  );

  if (legalClaims.rows[0].count > 0) {
    return {
      eligible: false,
      reason: 'Pending legal claims - data required for legal defense'
    };
  }

  // Check retention requirements (e.g., financial records)
  const retentionPeriod = await getRetentionPeriod(userId);
  if (!retentionPeriod.expired) {
    return {
      eligible: false,
      reason: `Data retention required until ${retentionPeriod.expiryDate} for legal compliance`
    };
  }

  return { eligible: true };
}
```

---

### Right to Restriction of Processing (Article 18)

**Description**: Individuals can request limiting how their data is processed

**Implementation**:
```typescript
/**
 * Restriction of Processing Handler
 */
export async function handleRestrictionRequest(
  userId: string,
  reason: RestrictionReason
): Promise<RestrictionResult> {
  // Mark account as restricted
  await db.query(`
    UPDATE users
    SET processing_restricted = true,
        restriction_reason = $1,
        restriction_date = NOW()
    WHERE id = $2
  `, [reason, userId]);

  // Disable automated processing
  await disableAutomatedProcessing(userId);

  // Log restriction
  await auditLog.record({
    action: 'processing_restricted',
    userId,
    reason,
    timestamp: new Date()
  });

  return {
    success: true,
    restrictedAt: new Date(),
    allowedOperations: ['storage', 'legal_claims']
  };
}
```

---

### Right to Data Portability (Article 20)

**Description**: Individuals can receive their data in a structured, machine-readable format

**Implementation**:
```typescript
/**
 * Data Portability Handler
 */
export async function handlePortabilityRequest(
  userId: string,
  format: 'json' | 'csv' | 'xml'
): Promise<PortabilityPackage> {
  const userData = await collectUserData(userId);

  // Format data according to request
  const formattedData = await formatDataForPortability(userData, format);

  // Generate download package
  const package = {
    userId,
    format,
    generatedAt: new Date(),
    data: formattedData,
    schema: getDataSchema(),
    metadata: {
      standard: 'JSON-LD', // or CSV, XML
      version: '1.0'
    }
  };

  // Deliver securely
  await deliverPortabilityPackage(userId, package);

  return package;
}

/**
 * Format data for portability (machine-readable)
 */
async function formatDataForPortability(
  userData: UserDataCollection,
  format: 'json' | 'csv' | 'xml'
): Promise<string> {
  switch (format) {
    case 'json':
      return JSON.stringify(userData, null, 2);

    case 'csv':
      return convertToCSV(userData);

    case 'xml':
      return convertToXML(userData);

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
```

---

### Right to Object (Article 21)

**Description**: Individuals can object to processing, especially for direct marketing

**Implementation**:
```typescript
/**
 * Objection Handler
 */
export async function handleObjectionRequest(
  userId: string,
  processingType: 'marketing' | 'profiling' | 'legitimate_interest'
): Promise<ObjectionResult> {
  if (processingType === 'marketing') {
    // Immediate cessation for marketing
    await db.query(`
      UPDATE user_preferences
      SET marketing_emails = false,
          marketing_sms = false,
          marketing_push = false
      WHERE user_id = $1
    `, [userId]);

    await marketingService.unsubscribe(userId);

    return { success: true, ceased: true };
  }

  if (processingType === 'profiling') {
    // Stop automated profiling
    await db.query(`
      UPDATE users
      SET profiling_enabled = false
      WHERE id = $1
    `, [userId]);

    return { success: true, ceased: true };
  }

  // For legitimate interest, perform balancing test
  const balancingResult = await performBalancingTest(userId);

  if (balancingResult.userRightsPrevail) {
    await ceaseProcessing(userId, processingType);
    return { success: true, ceased: true };
  }

  return {
    success: false,
    ceased: false,
    reason: 'Compelling legitimate grounds override objection'
  };
}
```

---

### Rights Related to Automated Decision-Making (Article 22)

**Description**: Protection against solely automated decisions with legal/significant effects

**Implementation**:
```typescript
/**
 * Automated Decision-Making Transparency
 */
export async function explainAutomatedDecision(
  userId: string,
  decisionId: string
): Promise<DecisionExplanation> {
  const decision = await db.query(
    'SELECT * FROM automated_decisions WHERE id = $1 AND user_id = $2',
    [decisionId, userId]
  );

  if (!decision.rows[0]) {
    throw new NotFoundError('Decision not found');
  }

  return {
    decisionId,
    timestamp: decision.rows[0].timestamp,
    outcome: decision.rows[0].outcome,
    logic: decision.rows[0].logic_explanation,
    significance: decision.rows[0].significance,
    consequences: decision.rows[0].consequences,
    // Right to human intervention
    humanReviewAvailable: true,
    howToRequest: 'Contact support@yourcompany.com to request human review'
  };
}

/**
 * Request human review of automated decision
 */
export async function requestHumanReview(
  userId: string,
  decisionId: string
): Promise<ReviewRequest> {
  const reviewRequest = await db.query(`
    INSERT INTO human_review_requests (user_id, decision_id, requested_at, status)
    VALUES ($1, $2, NOW(), 'pending')
    RETURNING *
  `, [userId, decisionId]);

  // Notify review team
  await notifyReviewTeam(reviewRequest.rows[0]);

  return {
    requestId: reviewRequest.rows[0].id,
    status: 'pending',
    estimatedCompletionTime: '5 business days'
  };
}
```

## Data Minimization

### Principle

Collect only data that is adequate, relevant, and limited to what is necessary for the specified purpose.

### Implementation Strategy

**Data Collection Checklist**
```typescript
/**
 * Data minimization validator
 */
export function validateDataCollection(
  purpose: ProcessingPurpose,
  dataPoints: DataPoint[]
): ValidationResult {
  const necessaryData = getMinimumDataForPurpose(purpose);
  const unnecessaryData = dataPoints.filter(
    dp => !necessaryData.includes(dp.field)
  );

  if (unnecessaryData.length > 0) {
    return {
      valid: false,
      message: 'Collecting unnecessary data',
      unnecessaryFields: unnecessaryData.map(dp => dp.field),
      recommendation: 'Remove unnecessary fields to comply with data minimization'
    };
  }

  return { valid: true };
}

/**
 * Define minimum data requirements per purpose
 */
function getMinimumDataForPurpose(purpose: ProcessingPurpose): string[] {
  const minimumDataMap: Record<ProcessingPurpose, string[]> = {
    'account_creation': ['email', 'password', 'username'],
    'payment_processing': ['email', 'billing_address', 'payment_method'],
    'customer_support': ['email', 'support_inquiry'],
    'marketing': ['email'], // with explicit consent
    'analytics': ['anonymized_user_id', 'session_data'] // no PII
  };

  return minimumDataMap[purpose] || [];
}
```

**Progressive Data Collection**
- Collect only essential data at registration
- Request additional data when needed for specific features
- Allow users to skip optional fields

**Example: Registration Form**
```typescript
// Minimal registration
interface MinimalRegistration {
  email: string;        // Required
  password: string;     // Required
  username: string;     // Required
}

// Optional profile data (collected later if needed)
interface OptionalProfile {
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
}
```

### Data Retention & Deletion

**Retention Policies**
```typescript
interface RetentionPolicy {
  dataCategory: string;
  retentionPeriod: string;
  deletionMethod: 'hard-delete' | 'anonymize';
  legalBasis: string;
}

const retentionPolicies: RetentionPolicy[] = [
  {
    dataCategory: 'user_profile',
    retentionPeriod: 'active_account + 30_days',
    deletionMethod: 'hard-delete',
    legalBasis: 'Contract performance'
  },
  {
    dataCategory: 'transaction_records',
    retentionPeriod: '7_years',
    deletionMethod: 'anonymize',
    legalBasis: 'Legal obligation (tax law)'
  },
  {
    dataCategory: 'marketing_consent',
    retentionPeriod: '3_years',
    deletionMethod: 'hard-delete',
    legalBasis: 'Legitimate interest'
  },
  {
    dataCategory: 'activity_logs',
    retentionPeriod: '6_months',
    deletionMethod: 'hard-delete',
    legalBasis: 'Legitimate interest (security)'
  }
];
```

**Automated Deletion Job**
```typescript
/**
 * Automated data retention enforcement
 */
export async function enforceRetentionPolicies(): Promise<void> {
  for (const policy of retentionPolicies) {
    const expiredData = await findExpiredData(policy);

    for (const record of expiredData) {
      if (policy.deletionMethod === 'hard-delete') {
        await hardDelete(policy.dataCategory, record.id);
      } else {
        await anonymizeData(policy.dataCategory, record.id);
      }

      await auditLog.record({
        action: 'retention_policy_applied',
        dataCategory: policy.dataCategory,
        recordId: record.id,
        method: policy.deletionMethod,
        timestamp: new Date()
      });
    }
  }
}
```

## Consent Management

### Consent Requirements

**Valid Consent Must Be:**
1. **Freely Given**: No coercion or bundled consent
2. **Specific**: Separate consent for each purpose
3. **Informed**: Clear information about processing
4. **Unambiguous**: Clear affirmative action
5. **Withdrawable**: Easy to withdraw as to give

### Consent Implementation

```typescript
/**
 * Consent Management System
 */
export class ConsentManager {
  /**
   * Request consent from user
   */
  async requestConsent(
    userId: string,
    purpose: ConsentPurpose,
    consentText: string
  ): Promise<ConsentRequest> {
    const consentRequest = await db.query(`
      INSERT INTO consent_requests (user_id, purpose, consent_text, requested_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [userId, purpose, consentText]);

    return consentRequest.rows[0];
  }

  /**
   * Record consent
   */
  async recordConsent(
    userId: string,
    purpose: ConsentPurpose,
    granted: boolean
  ): Promise<ConsentRecord> {
    const consent = await db.query(`
      INSERT INTO user_consents (
        user_id, purpose, granted, consented_at,
        consent_method, ip_address, user_agent
      )
      VALUES ($1, $2, $3, NOW(), $4, $5, $6)
      RETURNING *
    `, [
      userId,
      purpose,
      granted,
      'explicit_checkbox',
      requestContext.ip,
      requestContext.userAgent
    ]);

    // Audit trail
    await auditLog.record({
      action: 'consent_recorded',
      userId,
      purpose,
      granted,
      timestamp: new Date()
    });

    return consent.rows[0];
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    userId: string,
    purpose: ConsentPurpose
  ): Promise<void> {
    await db.query(`
      UPDATE user_consents
      SET granted = false, withdrawn_at = NOW()
      WHERE user_id = $1 AND purpose = $2
    `, [userId, purpose]);

    // Immediately stop processing for this purpose
    await stopProcessing(userId, purpose);

    // Audit trail
    await auditLog.record({
      action: 'consent_withdrawn',
      userId,
      purpose,
      timestamp: new Date()
    });
  }

  /**
   * Check if consent is valid
   */
  async hasValidConsent(
    userId: string,
    purpose: ConsentPurpose
  ): Promise<boolean> {
    const consent = await db.query(`
      SELECT granted, consented_at, withdrawn_at
      FROM user_consents
      WHERE user_id = $1 AND purpose = $2
      ORDER BY consented_at DESC
      LIMIT 1
    `, [userId, purpose]);

    if (consent.rows.length === 0) {
      return false;
    }

    const record = consent.rows[0];

    // Check if withdrawn
    if (record.withdrawn_at) {
      return false;
    }

    // Check if consent is still valid (reconfirmation every 2 years)
    const consentAge = Date.now() - record.consented_at.getTime();
    const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;

    if (consentAge > twoYears) {
      return false; // Require reconfirmation
    }

    return record.granted;
  }
}
```

### Consent UI Examples

**Cookie Consent Banner**
```typescript
interface CookieConsent {
  necessary: boolean;      // Always true (cannot be disabled)
  functional: boolean;     // Optional
  analytics: boolean;      // Optional
  marketing: boolean;      // Optional
}

// Granular cookie consent (GDPR compliant)
function CookieConsentBanner() {
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false
  });

  const handleAcceptAll = () => {
    setConsent({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    });
    saveConsent(consent);
  };

  const handleRejectAll = () => {
    setConsent({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    });
    saveConsent(consent);
  };

  const handleCustomize = () => {
    // Show detailed consent modal
    showConsentModal(consent, setConsent);
  };

  return (
    <div className="cookie-banner">
      <p>We use cookies to improve your experience...</p>
      <button onClick={handleAcceptAll}>Accept All</button>
      <button onClick={handleRejectAll}>Reject All</button>
      <button onClick={handleCustomize}>Customize</button>
    </div>
  );
}
```

## Cross-Border Data Transfers

### Transfer Mechanisms

#### Standard Contractual Clauses (SCCs)

**When Required**: Transferring data from EU/EEA to countries without adequacy decision

**Implementation**:
```typescript
/**
 * Verify adequate data transfer mechanism
 */
export async function verifyDataTransfer(
  destinationCountry: string,
  dataCategory: string
): Promise<TransferValidation> {
  // Check if country has adequacy decision
  const adequacyCountries = [
    'CH', 'UK', 'IL', 'NZ', 'CA', 'JP', 'KR' // Switzerland, UK, Israel, New Zealand, etc.
  ];

  if (adequacyCountries.includes(destinationCountry)) {
    return {
      allowed: true,
      mechanism: 'adequacy_decision',
      requirements: []
    };
  }

  // Check if SCCs are in place
  const sccExists = await db.query(`
    SELECT * FROM standard_contractual_clauses
    WHERE destination_country = $1
      AND status = 'active'
      AND expiry_date > NOW()
  `, [destinationCountry]);

  if (sccExists.rows.length > 0) {
    return {
      allowed: true,
      mechanism: 'standard_contractual_clauses',
      requirements: ['scc_signed', 'transfer_impact_assessment']
    };
  }

  // No adequate mechanism
  return {
    allowed: false,
    mechanism: null,
    requirements: ['scc_required', 'transfer_impact_assessment_required']
  };
}
```

#### Transfer Impact Assessment (TIA)

**Required For**: All data transfers outside EU/EEA

```typescript
interface TransferImpactAssessment {
  destinationCountry: string;
  dataCategory: string;
  volumeOfData: 'low' | 'medium' | 'high';

  // Risk assessment
  legalFramework: {
    dataProtectionLaws: string;
    surveillanceLaws: string;
    adequacyLevel: 'adequate' | 'questionable' | 'inadequate';
  };

  // Safeguards
  safeguards: {
    sccsInPlace: boolean;
    encryption: boolean;
    pseudonymization: boolean;
    accessControls: boolean;
  };

  // Conclusion
  approved: boolean;
  approvedBy: string;
  approvedAt: Date;
  reviewDate: Date;
}
```

### Data Localization

**EU Data Residency**
```typescript
/**
 * Ensure data residency compliance
 */
export class DataResidencyService {
  /**
   * Store data in appropriate region
   */
  async storeData(
    userId: string,
    data: any,
    dataCategory: string
  ): Promise<void> {
    const userRegion = await getUserRegion(userId);

    if (userRegion === 'EU') {
      // Store in EU region
      await euDatabase.insert(dataCategory, data);
    } else if (userRegion === 'US') {
      // Store in US region
      await usDatabase.insert(dataCategory, data);
    } else {
      // Default region
      await defaultDatabase.insert(dataCategory, data);
    }
  }

  /**
   * Retrieve data from correct region
   */
  async retrieveData(userId: string, dataCategory: string): Promise<any> {
    const userRegion = await getUserRegion(userId);

    if (userRegion === 'EU') {
      return await euDatabase.query(dataCategory, userId);
    } else if (userRegion === 'US') {
      return await usDatabase.query(dataCategory, userId);
    } else {
      return await defaultDatabase.query(dataCategory, userId);
    }
  }
}
```

## Privacy by Design & Default

### Privacy by Design Principles

1. **Proactive not Reactive**: Anticipate privacy issues before they arise
2. **Privacy as Default**: Highest privacy settings by default
3. **Privacy Embedded**: Built into design, not added later
4. **Full Functionality**: Positive-sum, not zero-sum
5. **End-to-End Security**: Full lifecycle protection
6. **Visibility and Transparency**: Keep it open
7. **User-Centric**: Respect user privacy

### Implementation Examples

**Privacy-First Feature Development**
```typescript
/**
 * Privacy impact assessment for new features
 */
interface PrivacyImpactAssessment {
  featureName: string;
  dataCollected: DataPoint[];
  processingPurpose: string;
  legalBasis: string;

  risks: {
    description: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];

  privacyControls: {
    dataMinimization: boolean;
    encryption: boolean;
    anonymization: boolean;
    userConsent: boolean;
    accessControls: boolean;
  };

  approved: boolean;
  approvedBy: string;
}

// Example PIA for new analytics feature
const analyticsPIA: PrivacyImpactAssessment = {
  featureName: 'User Behavior Analytics',
  dataCollected: [
    { field: 'anonymized_user_id', type: 'pseudonymous' },
    { field: 'page_views', type: 'usage_data' },
    { field: 'session_duration', type: 'usage_data' }
  ],
  processingPurpose: 'Improve user experience and product features',
  legalBasis: 'Legitimate interest',

  risks: [
    {
      description: 'Potential re-identification through behavioral patterns',
      severity: 'medium',
      mitigation: 'Use k-anonymity (k=5) and differential privacy techniques'
    }
  ],

  privacyControls: {
    dataMinimization: true,  // Only collect necessary data points
    encryption: true,         // Encrypt data at rest and in transit
    anonymization: true,      // Use anonymized user IDs
    userConsent: false,       // Based on legitimate interest, but allow opt-out
    accessControls: true      // Restrict access to analytics team only
  },

  approved: true,
  approvedBy: 'Data Protection Officer'
};
```

## Data Protection Officer (DPO)

### DPO Responsibilities

- Monitor GDPR compliance
- Advise on data protection impact assessments
- Cooperate with supervisory authorities
- Act as contact point for data subjects
- Maintain processing records

### Contact Information

```
Data Protection Officer
Email: dpo@yourcompany.com
Phone: +1-XXX-XXX-XXXX
Address: [Your Company Address]
```

## Breach Notification

### Breach Response Plan

**Timeline**: 72 hours from breach discovery to notification

**Notification Requirements**:
```typescript
interface BreachNotification {
  breachId: string;
  discoveredAt: Date;

  // Description
  natureOfBreach: string;
  affectedDataCategories: string[];
  estimatedAffectedIndividuals: number;

  // Consequences
  likelyConsequences: string;

  // Measures
  measuresTaken: string[];
  measuresSuggested: string[];

  // DPO contact
  dpoName: string;
  dpoContact: string;

  // Supervisory authority
  notifiedAuthority: boolean;
  authorityNotifiedAt?: Date;

  // Affected individuals
  individualNotificationRequired: boolean;
  individualsNotifiedAt?: Date;
}

/**
 * Breach notification handler
 */
export async function handleDataBreach(
  breachDetails: BreachDetails
): Promise<void> {
  // 1. Log breach discovery
  const breach = await db.query(`
    INSERT INTO data_breaches (
      discovered_at, nature, affected_data, estimated_affected, status
    )
    VALUES (NOW(), $1, $2, $3, 'investigating')
    RETURNING *
  `, [
    breachDetails.nature,
    breachDetails.affectedData,
    breachDetails.estimatedAffected
  ]);

  const breachId = breach.rows[0].id;

  // 2. Assess breach severity
  const severity = await assessBreachSeverity(breachDetails);

  // 3. Notify DPO immediately
  await notifyDPO(breachId, breachDetails);

  // 4. If high risk, notify supervisory authority within 72 hours
  if (severity === 'high') {
    await notifySupervisoryAuthority(breachId, breachDetails);
  }

  // 5. If high risk to individuals, notify them without undue delay
  if (severity === 'high' && breachDetails.estimatedAffected > 0) {
    await notifyAffectedIndividuals(breachId, breachDetails);
  }

  // 6. Document breach in records
  await documentBreach(breachId, breachDetails);
}
```

## Compliance Checklist

### Pre-Launch Checklist

- [ ] Privacy Policy published and accessible
- [ ] Cookie Policy published
- [ ] Terms of Service include data processing terms
- [ ] Consent mechanism implemented
- [ ] Data Subject Rights request forms available
- [ ] Data retention policies configured
- [ ] Encryption enabled (TLS 1.3, AES-256)
- [ ] Access controls implemented (RBAC)
- [ ] Audit logging enabled
- [ ] Data Processing Agreements (DPA) signed with processors
- [ ] Privacy by Design review completed
- [ ] Data Protection Impact Assessment (DPIA) for high-risk processing
- [ ] DPO appointed (if required)
- [ ] Breach notification procedure documented
- [ ] Staff training on GDPR completed
- [ ] Cross-border transfer mechanisms in place (if applicable)

### Ongoing Compliance

- [ ] Quarterly access reviews
- [ ] Annual DPIA reviews
- [ ] Consent revalidation (every 2 years)
- [ ] Privacy Policy updates (as needed)
- [ ] Staff training (annual refresher)
- [ ] Vendor/processor audits (annual)
- [ ] Retention policy enforcement (automated)
- [ ] Security testing (quarterly pen tests)

## References

- GDPR Official Text: https://gdpr-info.eu/
- ICO GDPR Guidance: https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/
- EDPB Guidelines: https://edpb.europa.eu/our-work-tools/general-guidance/gdpr-guidelines-recommendations-best-practices_en
- Standard Contractual Clauses: https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en

---

**Document Control**
- **Version:** 1.0
- **Last Updated:** 2025-11-14
- **Owner:** Data Protection Officer
- **Review Cycle:** Annual
- **Next Review:** 2026-11-14
