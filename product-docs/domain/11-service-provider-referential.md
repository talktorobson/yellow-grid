# Service & Provider Referential Domain Model

**Version**: 1.0.0
**Last Updated**: 2025-01-17
**Status**: In Development
**Owner**: Platform Architecture Team

---

## Document Purpose

This document defines the complete domain model for **Service Catalog** and **Provider Referentials**, which mirror the client's (external sales system) service catalog and enable structured provider capability management. This serves as the authoritative specification for service management, regional pricing, provider specialties, and external system synchronization.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Geographic Master Data](#2-geographic-master-data)
3. [Service Catalog Domain](#3-service-catalog-domain)
4. [Regional Pricing Model](#4-regional-pricing-model)
5. [Service Skill Requirements](#5-service-skill-requirements)
6. [Provider Specialty Model](#6-provider-specialty-model)
7. [Contract Template Abstraction](#7-contract-template-abstraction)
8. [Event-Driven Sync](#8-event-driven-sync)
9. [Business Rules](#9-business-rules)
10. [Domain Events](#10-domain-events)
11. [Repository Interfaces](#11-repository-interfaces)

---

## 1. Overview

### 1.1 Context

The Yellow Grid Platform integrates with multiple external sales systems (Pyxis, Tempo, SAP) that maintain master service catalogs. To enable:
- **Assignment transparency** (key differentiator)
- **Accurate provider matching** based on structured capabilities
- **Regional pricing** with postal code granularity
- **Bidirectional traceability** with client systems

We implement a **Service & Provider Referential** system with:
- **Client ownership** of service catalog (synced via Kafka events + daily reconciliation)
- **FSM ownership** of provider specialties and pricing
- **Postal code-based regional pricing** (3-level geographic hierarchy)
- **Event-driven sync** with conflict detection and manual review workflows

### 1.2 Key Principles

**Data Ownership:**
- **Service Catalog**: Client-owned, FSM mirrors with local enrichments
- **Pricing**: FSM-owned (set by country managers)
- **Provider Specialties**: FSM-owned
- **Contract Templates**: FSM-owned (abstracted over Adobe Sign)

**Sync Strategy:**
- **Real-time**: Kafka events (`service.created`, `service.updated`, `service.deprecated`)
- **Daily reconciliation**: Flat file import from GCS bucket for drift detection
- **Idempotency**: Event ID deduplication prevents duplicate processing

**Multi-Tenancy:**
- All entities partitioned by `country_code` + `business_unit`
- Regional pricing supports postal code-level granularity

---

## 2. Geographic Master Data

### 2.1 Three-Level Hierarchy

```
Country (ES, FR, IT, PL)
  └── Province (Madrid: 28, Barcelona: 08)
      └── City (Madrid City, Barcelona City)
          └── Postal Code (28001, 28002, ..., 08001, 08002, ...)
```

### 2.2 Country Entity

```typescript
class Country extends Entity {
  readonly code: string;         // ES, FR, IT, PL (ISO 3166-1 alpha-2)
  readonly name: string;          // Spain, France, Italy, Poland
  readonly timezone: string;      // Europe/Madrid, Europe/Paris
  readonly currency: string;      // EUR
  readonly locale: string;        // es-ES, fr-FR, it-IT, pl-PL

  provinces: Province[];

  static create(props: CountryProps): Result<Country> {
    // Validation: code must be 2-3 chars, timezone valid, currency ISO 4217
    return Result.ok(new Country(props));
  }
}
```

### 2.3 Province Entity

```typescript
class Province extends Entity {
  readonly id: string;
  readonly countryCode: string;   // FK to Country
  readonly code: string;          // Province code (e.g., 28 for Madrid)
  readonly name: string;

  cities: City[];

  static create(props: ProvinceProps): Result<Province> {
    // Validation: unique per country
    return Result.ok(new Province(props));
  }
}
```

### 2.4 City Entity

```typescript
class City extends Entity {
  readonly id: string;
  readonly provinceId: string;    // FK to Province
  readonly name: string;

  postalCodes: PostalCode[];

  static create(props: CityProps): Result<City> {
    return Result.ok(new City(props));
  }
}
```

### 2.5 Postal Code Entity

```typescript
class PostalCode extends Entity {
  readonly id: string;
  readonly cityId: string;        // FK to City
  readonly code: string;          // Full postal code (28001, 75001)

  // Business Methods
  isValid(): boolean {
    return this.code.length >= 4 && this.code.length <= 10;
  }

  static create(props: PostalCodeProps): Result<PostalCode> {
    // Validation: format depends on country
    return Result.ok(new PostalCode(props));
  }
}
```

---

## 3. Service Catalog Domain

### 3.1 Service Types

```typescript
enum ServiceType {
  INSTALLATION = 'INSTALLATION',
  CONFIRMATION_TV = 'CONFIRMATION_TV',      // Confirmation technical visit
  QUOTATION_TV = 'QUOTATION_TV',            // Quotation technical visit
  MAINTENANCE = 'MAINTENANCE',
  REWORK = 'REWORK',
  COMPLEX = 'COMPLEX'
}
```

### 3.2 Service Categories

```typescript
enum ServiceCategory {
  HVAC = 'HVAC',
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  APPLIANCE_REPAIR = 'APPLIANCE_REPAIR',
  KITCHEN_INSTALLATION = 'KITCHEN_INSTALLATION',
  BATHROOM_INSTALLATION = 'BATHROOM_INSTALLATION',
  FLOORING = 'FLOORING',
  PAINTING = 'PAINTING',
  GENERAL_MAINTENANCE = 'GENERAL_MAINTENANCE',
  OTHER = 'OTHER'
}
```

### 3.3 Service Status

```typescript
enum ServiceStatus {
  CREATED = 'CREATED',        // Newly created, not yet active
  ACTIVE = 'ACTIVE',          // Available for booking
  DEPRECATED = 'DEPRECATED'   // No longer offered (archive)
}
```

### 3.4 Service Catalog Aggregate Root

```typescript
class ServiceCatalog extends AggregateRoot<ServiceCatalogId> {
  private _id: ServiceCatalogId;

  // ===== EXTERNAL SYSTEM MAPPING =====
  private _externalServiceCode: string;       // Client's code (Pyxis/Tempo/SAP)
  private _externalSystemSource: string;      // PYXIS | TEMPO | SAP

  // ===== FSM INTERNAL CODE =====
  private _fsmServiceCode: string;            // Yellow Grid's internal code

  // ===== CLASSIFICATION =====
  private _serviceType: ServiceType;
  private _serviceCategory: ServiceCategory;

  // ===== DESCRIPTIVE (i18n) =====
  private _nameI18n: I18nText;                // {es: "...", fr: "...", it: "...", pl: "..."}
  private _descriptionI18n: I18nText;
  private _shortDescriptionI18n: I18nText;

  // ===== SCOPE DEFINITION =====
  private _scopeIncluded: string[];           // What's included in execution
  private _scopeExcluded: string[];           // What's NOT included

  // ===== PREREQUISITES =====
  private _worksiteRequirements: string[];    // ["Electrical outlet within 2m"]
  private _productPrerequisites: string[];    // ["AC unit delivered"]

  // ===== CONTRACT REQUIREMENT =====
  private _contractTemplateId?: string;

  // ===== EFFORT ESTIMATION =====
  private _estimatedDurationMinutes?: number;
  private _estimatedComplexity: Complexity;   // LOW | MEDIUM | HIGH | CRITICAL
  private _requiresTechnicalVisit: boolean;

  // ===== MULTI-TENANCY =====
  private _countryCode: string;
  private _businessUnit: string;

  // ===== LIFECYCLE MANAGEMENT =====
  private _status: ServiceStatus;
  private _effectiveFrom: DateTime;
  private _effectiveTo?: DateTime;
  private _deprecatedReason?: string;
  private _replacementServiceId?: ServiceCatalogId;

  // ===== SYNC METADATA =====
  private _lastSyncedAt?: DateTime;
  private _syncVersion?: string;              // Client's version number
  private _syncChecksum?: string;             // SHA256 for drift detection

  // Getters
  get externalServiceCode(): string { return this._externalServiceCode; }
  get fsmServiceCode(): string { return this._fsmServiceCode; }
  get serviceType(): ServiceType { return this._serviceType; }
  get serviceCategory(): ServiceCategory { return this._serviceCategory; }
  get status(): ServiceStatus { return this._status; }
  get isActive(): boolean { return this._status === ServiceStatus.ACTIVE; }
  get isDeprecated(): boolean { return this._status === ServiceStatus.DEPRECATED; }

  // Business Methods
  deprecate(reason: string, replacementService?: ServiceCatalogId): Result<void> {
    // Invariant: Cannot deprecate if not ACTIVE
    if (this._status !== ServiceStatus.ACTIVE) {
      return Result.fail('Can only deprecate ACTIVE services');
    }

    this._status = ServiceStatus.DEPRECATED;
    this._effectiveTo = DateTime.now();
    this._deprecatedReason = reason;
    this._replacementServiceId = replacementService;

    this.addDomainEvent(new ServiceDeprecated(
      this._id,
      reason,
      replacementService,
      DateTime.now()
    ));

    return Result.ok();
  }

  updateFromExternalSystem(data: ExternalServiceData): Result<void> {
    // Update mutable fields (name, description, scope, etc.)
    // Immutable fields (externalServiceCode, serviceType) cannot change

    this._nameI18n = data.nameI18n;
    this._descriptionI18n = data.descriptionI18n;
    this._scopeIncluded = data.scopeIncluded;
    this._scopeExcluded = data.scopeExcluded;
    this._worksiteRequirements = data.worksiteRequirements;
    this._productPrerequisites = data.productPrerequisites;

    this._lastSyncedAt = DateTime.now();
    this._syncVersion = data.version;
    this._syncChecksum = this.computeChecksum(data);

    this.addDomainEvent(new ServiceUpdatedFromExternal(
      this._id,
      data.version,
      DateTime.now()
    ));

    return Result.ok();
  }

  private computeChecksum(data: ExternalServiceData): string {
    // SHA256 of relevant fields for drift detection
    const crypto = require('crypto');
    const relevantFields = {
      name: data.nameI18n,
      description: data.descriptionI18n,
      scope: data.scopeIncluded,
      requirements: data.worksiteRequirements,
    };
    return crypto.createHash('sha256').update(JSON.stringify(relevantFields)).digest('hex');
  }

  static create(props: ServiceCatalogProps): Result<ServiceCatalog> {
    // Validation
    if (!props.externalServiceCode || props.externalServiceCode.trim().length === 0) {
      return Result.fail('External service code cannot be empty');
    }

    if (!props.fsmServiceCode || props.fsmServiceCode.trim().length === 0) {
      return Result.fail('FSM service code cannot be empty');
    }

    const service = new ServiceCatalog(props);

    service.addDomainEvent(new ServiceCreated(
      service._id,
      service._externalServiceCode,
      service._fsmServiceCode,
      service._serviceType,
      service._countryCode,
      DateTime.now()
    ));

    return Result.ok(service);
  }
}
```

---

## 4. Regional Pricing Model

### 4.1 Pricing Unit

```typescript
enum PricingUnit {
  FIXED = 'FIXED',        // One-time flat rate
  HOURLY = 'HOURLY',      // Per hour
  DAILY = 'DAILY'         // Per day
}
```

### 4.2 Service Pricing Entity

```typescript
class ServicePricing extends Entity<ServicePricingId> {
  private _id: ServicePricingId;
  private _serviceId: ServiceCatalogId;

  // ===== GEOGRAPHIC SCOPE =====
  private _countryCode: string;
  private _businessUnit: string;
  private _postalCodeId?: PostalCodeId;       // NULL = country/BU default

  // ===== PRICING =====
  private _baseRate: Money;
  private _unit: PricingUnit;

  // ===== MULTIPLIERS =====
  private _overtimeMultiplier: number;        // Default: 1.5
  private _weekendMultiplier: number;         // Default: 1.3
  private _holidayMultiplier: number;         // Default: 2.0
  private _urgencyMultiplier: number;         // Default: 1.2

  // ===== COST COMPONENTS =====
  private _materialAllowance?: Money;
  private _travelAllowance?: Money;

  // ===== VALIDITY PERIOD =====
  private _effectiveFrom: DateTime;
  private _effectiveTo?: DateTime;

  // Getters
  get baseRate(): Money { return this._baseRate; }
  get postalCodeId(): PostalCodeId | undefined { return this._postalCodeId; }
  get isDefault(): boolean { return this._postalCodeId === undefined; }

  // Business Methods
  calculateTotalCost(
    duration: Duration,
    isOvertime: boolean,
    isWeekend: boolean,
    isHoliday: boolean,
    isUrgent: boolean
  ): Money {
    let rate = this._baseRate.amount;

    // Apply multipliers
    if (isOvertime) rate *= this._overtimeMultiplier;
    if (isWeekend) rate *= this._weekendMultiplier;
    if (isHoliday) rate *= this._holidayMultiplier;
    if (isUrgent) rate *= this._urgencyMultiplier;

    // Calculate based on unit
    let total = rate;
    if (this._unit === PricingUnit.HOURLY) {
      total = rate * duration.toHours();
    } else if (this._unit === PricingUnit.DAILY) {
      total = rate * Math.ceil(duration.toDays());
    }

    // Add allowances
    if (this._materialAllowance) total += this._materialAllowance.amount;
    if (this._travelAllowance) total += this._travelAllowance.amount;

    return Money.create(total, this._baseRate.currency).value;
  }

  isEffectiveOn(date: DateTime): boolean {
    const isAfterStart = date.isAfterOrEqual(this._effectiveFrom);
    const isBeforeEnd = this._effectiveTo ? date.isBefore(this._effectiveTo) : true;
    return isAfterStart && isBeforeEnd;
  }

  static create(props: ServicePricingProps): Result<ServicePricing> {
    // Validation
    if (props.baseRate.amount <= 0) {
      return Result.fail('Base rate must be positive');
    }

    if (props.effectiveTo && props.effectiveTo.isBefore(props.effectiveFrom)) {
      return Result.fail('Effective to date must be after effective from');
    }

    return Result.ok(new ServicePricing(props));
  }
}
```

### 4.3 Pricing Lookup Service

```typescript
class ServicePricingService {
  constructor(
    private readonly pricingRepository: ServicePricingRepository,
    private readonly postalCodeRepository: PostalCodeRepository
  ) {}

  async findPricing(
    serviceId: ServiceCatalogId,
    countryCode: string,
    businessUnit: string,
    postalCode: string,
    effectiveDate: DateTime
  ): Promise<Result<ServicePricing>> {

    // Step 1: Resolve postal code to ID
    const postalCodeEntity = await this.postalCodeRepository.findByCode(postalCode);

    if (!postalCodeEntity) {
      return Result.fail(`Postal code ${postalCode} not found`);
    }

    // Step 2: Try postal code-specific pricing
    const regionalPricing = await this.pricingRepository.find({
      serviceId,
      countryCode,
      businessUnit,
      postalCodeId: postalCodeEntity.id,
      effectiveDate
    });

    if (regionalPricing) {
      return Result.ok(regionalPricing);
    }

    // Step 3: Fallback to country/BU default
    const defaultPricing = await this.pricingRepository.find({
      serviceId,
      countryCode,
      businessUnit,
      postalCodeId: null,  // NULL = default
      effectiveDate
    });

    if (defaultPricing) {
      return Result.ok(defaultPricing);
    }

    return Result.fail(`No pricing found for service ${serviceId.value} in ${countryCode}/${businessUnit}`);
  }
}
```

---

## 5. Service Skill Requirements

### 5.1 Skill Level

```typescript
enum SkillLevel {
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}
```

### 5.2 Service Skill Requirement Entity

```typescript
class ServiceSkillRequirement extends Entity<ServiceSkillRequirementId> {
  private _id: ServiceSkillRequirementId;
  private _serviceId: ServiceCatalogId;

  // ===== SKILL DEFINITION =====
  private _skillCategory: string;             // HVAC_INSTALLATION, PLUMBING_REPAIR, etc.
  private _skillLevel: SkillLevel;
  private _skillDescription: string;

  // ===== REQUIREMENT TYPE =====
  private _isRequired: boolean;               // vs nice-to-have
  private _isPrimary: boolean;                // Main skill vs supporting skill

  // ===== CERTIFICATION =====
  private _certificationRequired: boolean;
  private _certificationCode?: string;
  private _certificationAuthority?: string;
  private _certificationMinLevel?: string;

  // ===== COUNTRY-SPECIFIC =====
  private _countryCode: string;               // Requirements vary by country

  // Getters
  get skillCategory(): string { return this._skillCategory; }
  get skillLevel(): SkillLevel { return this._skillLevel; }
  get isRequired(): boolean { return this._isRequired; }
  get certificationRequired(): boolean { return this._certificationRequired; }

  // Business Methods
  matchesProviderSkill(providerSkillLevel: SkillLevel, hasCertification: boolean): boolean {
    // Check skill level (provider must meet or exceed)
    const skillLevelOrder = {
      [SkillLevel.BASIC]: 1,
      [SkillLevel.INTERMEDIATE]: 2,
      [SkillLevel.ADVANCED]: 3,
      [SkillLevel.EXPERT]: 4
    };

    if (skillLevelOrder[providerSkillLevel] < skillLevelOrder[this._skillLevel]) {
      return false;
    }

    // Check certification
    if (this._certificationRequired && !hasCertification) {
      return false;
    }

    return true;
  }

  static create(props: ServiceSkillRequirementProps): Result<ServiceSkillRequirement> {
    // Validation
    if (!props.skillCategory || props.skillCategory.trim().length === 0) {
      return Result.fail('Skill category cannot be empty');
    }

    return Result.ok(new ServiceSkillRequirement(props));
  }
}
```

---

## 6. Provider Specialty Model

### 6.1 Provider Specialty Entity

```typescript
class ProviderSpecialty extends Entity<ProviderSpecialtyId> {
  private _id: ProviderSpecialtyId;

  // ===== IDENTITY =====
  private _specialtyCode: string;             // HVAC_INSTALL_RESIDENTIAL

  // ===== DESCRIPTIVE =====
  private _nameI18n: I18nText;
  private _descriptionI18n: I18nText;

  // ===== CLASSIFICATION =====
  private _category: ServiceCategory;
  private _subcategory?: string;              // Residential, Commercial, Industrial

  // ===== MULTI-TENANCY =====
  private _countryCode: string;
  private _businessUnit: string;

  // ===== STATUS =====
  private _isActive: boolean;

  // Relations
  private _serviceMappings: SpecialtyServiceMapping[];

  // Getters
  get specialtyCode(): string { return this._specialtyCode; }
  get category(): ServiceCategory { return this._category; }
  get isActive(): boolean { return this._isActive; }

  // Business Methods
  canPerformService(serviceId: ServiceCatalogId): boolean {
    return this._serviceMappings.some(m => m.serviceId.equals(serviceId));
  }

  addServiceMapping(serviceId: ServiceCatalogId, proficiencyLevel: string): Result<void> {
    // Check if already mapped
    if (this._serviceMappings.some(m => m.serviceId.equals(serviceId))) {
      return Result.fail('Service already mapped to this specialty');
    }

    const mapping = SpecialtyServiceMapping.create({
      specialtyId: this._id,
      serviceId,
      proficiencyLevel
    }).value;

    this._serviceMappings.push(mapping);

    this.addDomainEvent(new ServiceMappedToSpecialty(
      this._id,
      serviceId,
      proficiencyLevel,
      DateTime.now()
    ));

    return Result.ok();
  }

  static create(props: ProviderSpecialtyProps): Result<ProviderSpecialty> {
    // Validation
    if (!props.specialtyCode || props.specialtyCode.trim().length === 0) {
      return Result.fail('Specialty code cannot be empty');
    }

    const specialty = new ProviderSpecialty(props);

    specialty.addDomainEvent(new SpecialtyCreated(
      specialty._id,
      specialty._specialtyCode,
      specialty._category,
      specialty._countryCode,
      DateTime.now()
    ));

    return Result.ok(specialty);
  }
}
```

### 6.2 Specialty Service Mapping

```typescript
class SpecialtyServiceMapping extends ValueObject {
  readonly specialtyId: ProviderSpecialtyId;
  readonly serviceId: ServiceCatalogId;
  readonly proficiencyLevel: string;          // BASIC, PROFICIENT, EXPERT
  readonly typicalDurationMinutes?: number;

  static create(props: SpecialtyServiceMappingProps): Result<SpecialtyServiceMapping> {
    return Result.ok(new SpecialtyServiceMapping(props));
  }
}
```

### 6.3 Provider Specialty Assignment

```typescript
class ProviderSpecialtyAssignment extends Entity<ProviderSpecialtyAssignmentId> {
  private _id: ProviderSpecialtyAssignmentId;
  private _providerId: ProviderId;
  private _specialtyId: ProviderSpecialtyId;

  // ===== CERTIFICATION =====
  private _isCertified: boolean;
  private _certificationNumber?: string;
  private _certificationExpiresAt?: DateTime;
  private _certificationAuthority?: string;
  private _certificationDocuments?: string[]; // URLs

  // ===== PROFICIENCY =====
  private _experienceLevel: ExperienceLevel;  // JUNIOR, INTERMEDIATE, SENIOR, EXPERT
  private _yearsOfExperience?: number;

  // ===== PERFORMANCE TRACKING =====
  private _totalJobsCompleted: number;
  private _totalJobsFailed: number;
  private _avgQualityScore?: number;          // 0.00 - 5.00
  private _avgCompletionTimeMinutes?: number;
  private _lastJobCompletedAt?: DateTime;

  // ===== STATUS =====
  private _isActive: boolean;
  private _assignedAt: DateTime;
  private _revokedAt?: DateTime;
  private _revokedReason?: string;

  // Getters
  get isCertified(): boolean { return this._isCertified; }
  get isCertificationExpired(): boolean {
    return this._certificationExpiresAt
      ? DateTime.now().isAfter(this._certificationExpiresAt)
      : false;
  }
  get experienceLevel(): ExperienceLevel { return this._experienceLevel; }
  get successRate(): number {
    const total = this._totalJobsCompleted + this._totalJobsFailed;
    return total > 0 ? (this._totalJobsCompleted / total) * 100 : 0;
  }

  // Business Methods
  recordJobCompletion(
    durationMinutes: number,
    qualityScore: number,
    success: boolean
  ): Result<void> {
    if (success) {
      this._totalJobsCompleted++;
    } else {
      this._totalJobsFailed++;
    }

    // Update averages
    const totalJobs = this._totalJobsCompleted;

    if (this._avgCompletionTimeMinutes) {
      this._avgCompletionTimeMinutes =
        ((this._avgCompletionTimeMinutes * (totalJobs - 1)) + durationMinutes) / totalJobs;
    } else {
      this._avgCompletionTimeMinutes = durationMinutes;
    }

    if (this._avgQualityScore) {
      this._avgQualityScore =
        ((this._avgQualityScore * (totalJobs - 1)) + qualityScore) / totalJobs;
    } else {
      this._avgQualityScore = qualityScore;
    }

    this._lastJobCompletedAt = DateTime.now();

    return Result.ok();
  }

  revoke(reason: string, revokedBy: string): Result<void> {
    if (!this._isActive) {
      return Result.fail('Specialty assignment is already revoked');
    }

    this._isActive = false;
    this._revokedAt = DateTime.now();
    this._revokedReason = reason;

    this.addDomainEvent(new SpecialtyRevoked(
      this._id,
      this._providerId,
      this._specialtyId,
      reason,
      revokedBy,
      DateTime.now()
    ));

    return Result.ok();
  }

  static create(props: ProviderSpecialtyAssignmentProps): Result<ProviderSpecialtyAssignment> {
    const assignment = new ProviderSpecialtyAssignment(props);

    assignment.addDomainEvent(new SpecialtyAssignedToProvider(
      assignment._id,
      assignment._providerId,
      assignment._specialtyId,
      assignment._isCertified,
      assignment._experienceLevel,
      DateTime.now()
    ));

    return Result.ok(assignment);
  }
}

enum ExperienceLevel {
  JUNIOR = 'JUNIOR',
  INTERMEDIATE = 'INTERMEDIATE',
  SENIOR = 'SENIOR',
  EXPERT = 'EXPERT'
}
```

---

## 7. Contract Template Abstraction

### 7.1 Contract Template Entity

```typescript
class ContractTemplate extends Entity<ContractTemplateId> {
  private _id: ContractTemplateId;

  // ===== IDENTITY =====
  private _templateCode: string;
  private _nameI18n: I18nText;

  // ===== EXTERNAL PROVIDER =====
  private _providerType: ContractProviderType; // ADOBE_SIGN, DOCUSIGN, etc.
  private _externalTemplateId: string;         // Adobe Sign template ID

  // ===== VERSIONING (Future) =====
  private _version: string;                    // 1.0, 1.1, 2.0
  private _isLatestVersion: boolean;

  // ===== CLASSIFICATION =====
  private _contractType: ContractType;         // PRE_SERVICE, POST_SERVICE (WCF)
  private _serviceTypes?: ServiceType[];       // Which service types use this

  // ===== MULTI-TENANCY =====
  private _countryCode: string;
  private _businessUnit: string;

  // ===== STATUS =====
  private _isActive: boolean;

  // Getters
  get templateCode(): string { return this._templateCode; }
  get externalTemplateId(): string { return this._externalTemplateId; }
  get isActive(): boolean { return this._isActive; }

  // Business Methods
  supportsServiceType(serviceType: ServiceType): boolean {
    if (!this._serviceTypes || this._serviceTypes.length === 0) {
      return true; // Applies to all service types
    }
    return this._serviceTypes.includes(serviceType);
  }

  deprecate(reason: string): Result<void> {
    if (!this._isActive) {
      return Result.fail('Contract template is already deprecated');
    }

    this._isActive = false;

    this.addDomainEvent(new ContractTemplateDeprecated(
      this._id,
      reason,
      DateTime.now()
    ));

    return Result.ok();
  }

  static create(props: ContractTemplateProps): Result<ContractTemplate> {
    // Validation
    if (!props.templateCode || props.templateCode.trim().length === 0) {
      return Result.fail('Template code cannot be empty');
    }

    if (!props.externalTemplateId || props.externalTemplateId.trim().length === 0) {
      return Result.fail('External template ID cannot be empty');
    }

    return Result.ok(new ContractTemplate(props));
  }
}

enum ContractProviderType {
  ADOBE_SIGN = 'ADOBE_SIGN',
  DOCUSIGN = 'DOCUSIGN',
  CUSTOM = 'CUSTOM'
}

enum ContractType {
  PRE_SERVICE = 'PRE_SERVICE',
  POST_SERVICE = 'POST_SERVICE'
}
```

---

## 8. Event-Driven Sync

### 8.1 Service Catalog Event Log

```typescript
class ServiceCatalogEventLog extends Entity<ServiceCatalogEventLogId> {
  private _id: ServiceCatalogEventLogId;

  // ===== EVENT METADATA =====
  private _eventId: string;                   // Kafka message ID (unique)
  private _eventType: string;                 // service.created, service.updated, service.deprecated
  private _eventSource: string;               // PYXIS, TEMPO, SAP
  private _eventTimestamp: DateTime;

  // ===== SERVICE REFERENCE =====
  private _externalServiceCode: string;
  private _serviceId?: ServiceCatalogId;      // NULL if not yet processed

  // ===== EVENT PAYLOAD =====
  private _payload: any;                      // Full Kafka message
  private _payloadChecksum: string;           // SHA256

  // ===== PROCESSING STATUS =====
  private _processingStatus: EventProcessingStatus;
  private _processingAttempts: number;
  private _processedAt?: DateTime;
  private _errorMessage?: string;
  private _errorDetails?: any;

  // ===== AUDIT =====
  private _receivedAt: DateTime;

  // Getters
  get eventId(): string { return this._eventId; }
  get processingStatus(): EventProcessingStatus { return this._processingStatus; }
  get isProcessed(): boolean { return this._processingStatus === EventProcessingStatus.PROCESSED; }
  get hasFailed(): boolean { return this._processingStatus === EventProcessingStatus.FAILED; }

  // Business Methods
  markAsProcessed(serviceId: ServiceCatalogId): Result<void> {
    this._processingStatus = EventProcessingStatus.PROCESSED;
    this._serviceId = serviceId;
    this._processedAt = DateTime.now();

    return Result.ok();
  }

  markAsFailed(error: Error): Result<void> {
    this._processingStatus = EventProcessingStatus.FAILED;
    this._processingAttempts++;
    this._errorMessage = error.message;
    this._errorDetails = { stack: error.stack };

    return Result.ok();
  }

  canRetry(maxAttempts: number = 3): boolean {
    return this._processingAttempts < maxAttempts && this.hasFailed;
  }

  static create(props: ServiceCatalogEventLogProps): Result<ServiceCatalogEventLog> {
    // Validation
    if (!props.eventId || props.eventId.trim().length === 0) {
      return Result.fail('Event ID cannot be empty');
    }

    return Result.ok(new ServiceCatalogEventLog(props));
  }
}

enum EventProcessingStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}
```

### 8.2 Daily Reconciliation

```typescript
class ServiceCatalogReconciliation extends Entity<ServiceCatalogReconciliationId> {
  private _id: ServiceCatalogReconciliationId;

  // ===== JOB EXECUTION =====
  private _startedAt: DateTime;
  private _completedAt?: DateTime;
  private _status: ReconciliationStatus;

  // ===== STATS =====
  private _servicesFetched: number;
  private _servicesMatched: number;
  private _servicesDrifted: number;           // Checksum mismatch
  private _servicesCreated: number;
  private _servicesUpdated: number;
  private _servicesFailed: number;

  // ===== SOURCE =====
  private _sourceSystem: string;              // PYXIS, TEMPO, SAP
  private _sourceFileUrl?: string;            // GCS URL (gs://)

  // ===== ERROR TRACKING =====
  private _errorMessage?: string;
  private _errorDetails?: any;

  // ===== AUDIT =====
  private _triggeredBy: string;               // SCHEDULED_JOB, MANUAL, user ID

  // Getters
  get status(): ReconciliationStatus { return this._status; }
  get driftPercentage(): number {
    return this._servicesMatched > 0
      ? (this._servicesDrifted / this._servicesMatched) * 100
      : 0;
  }

  // Business Methods
  complete(stats: ReconciliationStats): Result<void> {
    this._completedAt = DateTime.now();
    this._servicesFetched = stats.fetched;
    this._servicesMatched = stats.matched;
    this._servicesDrifted = stats.drifted;
    this._servicesUpdated = stats.updated;

    // Determine status
    if (this._servicesFailed > 0) {
      this._status = ReconciliationStatus.PARTIAL_SUCCESS;
    } else if (this._servicesDrifted > 0) {
      this._status = ReconciliationStatus.PARTIAL_SUCCESS;
    } else {
      this._status = ReconciliationStatus.SUCCESS;
    }

    return Result.ok();
  }

  fail(error: Error): Result<void> {
    this._completedAt = DateTime.now();
    this._status = ReconciliationStatus.FAILED;
    this._errorMessage = error.message;
    this._errorDetails = { stack: error.stack };

    return Result.ok();
  }

  static create(props: ServiceCatalogReconciliationProps): Result<ServiceCatalogReconciliation> {
    return Result.ok(new ServiceCatalogReconciliation(props));
  }
}

enum ReconciliationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED'
}
```

---

## 9. Business Rules

### BR-SC-001: Service Code Uniqueness
**Rule**: External service codes must be unique within a country + business unit.
**Rationale**: Prevents duplicate service definitions from different sync sources.
**Enforcement**: Database unique constraint + application-level validation.

### BR-SC-002: Service Deprecation
**Rule**: Services can only transition from ACTIVE to DEPRECATED, never back.
**Rationale**: Ensures data integrity and audit trail.
**Enforcement**: State machine validation in `deprecate()` method.

### BR-SC-003: Active Order Deprecation
**Rule**: Services can be deprecated even if active orders exist, but require logging.
**Rationale**: Client controls catalog lifecycle, not FSM.
**Enforcement**: Warning log + notification to operators.

### BR-PR-001: Pricing Hierarchy
**Rule**: Postal code-specific pricing overrides country/BU default.
**Rationale**: Allows regional price variations.
**Enforcement**: Pricing lookup service hierarchy.

### BR-PR-002: Pricing Validity
**Rule**: Only one pricing record can be active for a given service + location + date.
**Rationale**: Prevents ambiguous pricing.
**Enforcement**: Unique constraint on (service_id, country_code, business_unit, postal_code_id, effective_from).

### BR-PR-003: Positive Pricing
**Rule**: Base rate must be positive (> 0).
**Rationale**: Cannot have free or negative-cost services.
**Enforcement**: Domain validation in `ServicePricing.create()`.

### BR-PS-001: Specialty Assignment
**Rule**: Providers can have multiple specialties, but each specialty can only be assigned once.
**Rationale**: Prevents duplicate assignments.
**Enforcement**: Unique constraint on (provider_id, specialty_id).

### BR-PS-002: Certification Expiry
**Rule**: Expired certifications automatically deactivate specialty assignments.
**Rationale**: Ensures only qualified providers perform services.
**Enforcement**: Daily batch job checks certification expiry.

### BR-PS-003: Specialty Revocation
**Rule**: Revoked specialty assignments cannot be reactivated, must create new assignment.
**Rationale**: Maintains audit trail.
**Enforcement**: State validation in `revoke()` method.

### BR-SYNC-001: Event Idempotency
**Rule**: Each Kafka event (by event ID) can only be processed once.
**Rationale**: Prevents duplicate processing on retries.
**Enforcement**: Unique constraint on event_id + check before processing.

### BR-SYNC-002: Breaking Change Detection
**Rule**: Changes to scope_included, scope_excluded, or requirements are flagged as breaking.
**Rationale**: May impact active orders or provider capabilities.
**Enforcement**: Diff logic in sync service.

### BR-SYNC-003: Reconciliation Frequency
**Rule**: Daily reconciliation runs at 3 AM local time.
**Rationale**: Detect drift caused by missed Kafka events or data corruption.
**Enforcement**: Cron schedule.

---

## 10. Domain Events

### Service Catalog Events

```typescript
class ServiceCreated extends DomainEvent {
  constructor(
    public readonly serviceId: ServiceCatalogId,
    public readonly externalServiceCode: string,
    public readonly fsmServiceCode: string,
    public readonly serviceType: ServiceType,
    public readonly countryCode: string,
    public readonly createdAt: DateTime
  ) { super(); }
}

class ServiceUpdatedFromExternal extends DomainEvent {
  constructor(
    public readonly serviceId: ServiceCatalogId,
    public readonly syncVersion: string,
    public readonly updatedAt: DateTime
  ) { super(); }
}

class ServiceDeprecated extends DomainEvent {
  constructor(
    public readonly serviceId: ServiceCatalogId,
    public readonly reason: string,
    public readonly replacementServiceId: ServiceCatalogId | undefined,
    public readonly deprecatedAt: DateTime
  ) { super(); }
}
```

### Provider Specialty Events

```typescript
class SpecialtyCreated extends DomainEvent {
  constructor(
    public readonly specialtyId: ProviderSpecialtyId,
    public readonly specialtyCode: string,
    public readonly category: ServiceCategory,
    public readonly countryCode: string,
    public readonly createdAt: DateTime
  ) { super(); }
}

class SpecialtyAssignedToProvider extends DomainEvent {
  constructor(
    public readonly assignmentId: ProviderSpecialtyAssignmentId,
    public readonly providerId: ProviderId,
    public readonly specialtyId: ProviderSpecialtyId,
    public readonly isCertified: boolean,
    public readonly experienceLevel: ExperienceLevel,
    public readonly assignedAt: DateTime
  ) { super(); }
}

class SpecialtyRevoked extends DomainEvent {
  constructor(
    public readonly assignmentId: ProviderSpecialtyAssignmentId,
    public readonly providerId: ProviderId,
    public readonly specialtyId: ProviderSpecialtyId,
    public readonly reason: string,
    public readonly revokedBy: string,
    public readonly revokedAt: DateTime
  ) { super(); }
}

class ServiceMappedToSpecialty extends DomainEvent {
  constructor(
    public readonly specialtyId: ProviderSpecialtyId,
    public readonly serviceId: ServiceCatalogId,
    public readonly proficiencyLevel: string,
    public readonly mappedAt: DateTime
  ) { super(); }
}
```

### Sync Events

```typescript
class ServiceSyncEventReceived extends DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly eventType: string,
    public readonly externalServiceCode: string,
    public readonly receivedAt: DateTime
  ) { super(); }
}

class ServiceSyncCompleted extends DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly serviceId: ServiceCatalogId,
    public readonly processedAt: DateTime
  ) { super(); }
}

class ServiceSyncFailed extends DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly errorMessage: string,
    public readonly attemptNumber: number,
    public readonly failedAt: DateTime
  ) { super(); }
}

class ReconciliationCompleted extends DomainEvent {
  constructor(
    public readonly reconciliationId: ServiceCatalogReconciliationId,
    public readonly status: ReconciliationStatus,
    public readonly servicesDrifted: number,
    public readonly completedAt: DateTime
  ) { super(); }
}
```

---

## 11. Repository Interfaces

```typescript
interface ServiceCatalogRepository {
  findById(id: ServiceCatalogId): Promise<ServiceCatalog | null>;
  findByExternalCode(code: string): Promise<ServiceCatalog | null>;
  findByFsmCode(code: string): Promise<ServiceCatalog | null>;
  findAll(filter: ServiceCatalogFilter): Promise<ServiceCatalog[]>;
  findActiveByCountry(countryCode: string, businessUnit: string): Promise<ServiceCatalog[]>;
  save(service: ServiceCatalog): Promise<void>;
  delete(id: ServiceCatalogId): Promise<void>;
}

interface ServicePricingRepository {
  find(criteria: PricingCriteria): Promise<ServicePricing | null>;
  findAll(serviceId: ServiceCatalogId): Promise<ServicePricing[]>;
  save(pricing: ServicePricing): Promise<void>;
  delete(id: ServicePricingId): Promise<void>;
}

interface ProviderSpecialtyRepository {
  findById(id: ProviderSpecialtyId): Promise<ProviderSpecialty | null>;
  findByCode(code: string): Promise<ProviderSpecialty | null>;
  findByCategory(category: ServiceCategory, countryCode: string): Promise<ProviderSpecialty[]>;
  findAll(countryCode: string, businessUnit: string): Promise<ProviderSpecialty[]>;
  save(specialty: ProviderSpecialty): Promise<void>;
}

interface ProviderSpecialtyAssignmentRepository {
  findById(id: ProviderSpecialtyAssignmentId): Promise<ProviderSpecialtyAssignment | null>;
  findByProvider(providerId: ProviderId): Promise<ProviderSpecialtyAssignment[]>;
  findBySpecialty(specialtyId: ProviderSpecialtyId): Promise<ProviderSpecialtyAssignment[]>;
  findActiveByProvider(providerId: ProviderId): Promise<ProviderSpecialtyAssignment[]>;
  save(assignment: ProviderSpecialtyAssignment): Promise<void>;
}

interface ServiceCatalogEventLogRepository {
  findByEventId(eventId: string): Promise<ServiceCatalogEventLog | null>;
  findPendingEvents(limit: number): Promise<ServiceCatalogEventLog[]>;
  findFailedEvents(limit: number): Promise<ServiceCatalogEventLog[]>;
  save(eventLog: ServiceCatalogEventLog): Promise<void>;
}

interface ServiceCatalogReconciliationRepository {
  findById(id: ServiceCatalogReconciliationId): Promise<ServiceCatalogReconciliation | null>;
  findLatest(): Promise<ServiceCatalogReconciliation | null>;
  findAll(filter: ReconciliationFilter): Promise<ServiceCatalogReconciliation[]>;
  save(reconciliation: ServiceCatalogReconciliation): Promise<void>;
}

interface PostalCodeRepository {
  findByCode(code: string): Promise<PostalCode | null>;
  findByCity(cityId: string): Promise<PostalCode[]>;
  findByCountry(countryCode: string): Promise<PostalCode[]>;
  save(postalCode: PostalCode): Promise<void>;
}
```

---

## Document Control

- **Version**: 1.0.0
- **Last Updated**: 2025-01-17
- **Owner**: Platform Architecture Team
- **Review Cycle**: Quarterly
- **Related Documents**:
  - `/product-docs/domain/02-provider-capacity-domain.md`
  - `/product-docs/domain/03-project-service-order-domain.md`
  - `/product-docs/integration/09-service-catalog-sync.md`
  - `/product-docs/api/10-service-catalog-api.md`
