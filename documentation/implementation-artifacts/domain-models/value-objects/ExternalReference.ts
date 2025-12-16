/**
 * External Reference Value Object
 *
 * Represents references to external sales systems (Pyxis, Tempo, SAP).
 * Immutable value object following DDD principles.
 *
 * @see documentation/domain/03-project-service-order-domain.md (v2.0)
 */

export enum SalesSystem {
  PYXIS = 'PYXIS',
  TEMPO = 'TEMPO',
  SAP = 'SAP',
}

export interface ExternalReferenceProps {
  externalSalesOrderId?: string;
  externalProjectId?: string;
  externalLeadId?: string;
  systemSource: SalesSystem;
}

export class ExternalReference {
  private readonly _externalSalesOrderId?: string;
  private readonly _externalProjectId?: string;
  private readonly _externalLeadId?: string;
  private readonly _systemSource: SalesSystem;

  private constructor(props: ExternalReferenceProps) {
    this._externalSalesOrderId = props.externalSalesOrderId;
    this._externalProjectId = props.externalProjectId;
    this._externalLeadId = props.externalLeadId;
    this._systemSource = props.systemSource;
  }

  /**
   * Factory method to create ExternalReference
   * Validates that at least one external ID is provided
   */
  public static create(props: ExternalReferenceProps): ExternalReference {
    // Business rule: At least one external ID must be provided
    if (!props.externalSalesOrderId && !props.externalProjectId && !props.externalLeadId) {
      throw new Error('ExternalReference must have at least one external ID');
    }

    // Validate system source
    if (!Object.values(SalesSystem).includes(props.systemSource)) {
      throw new Error(`Invalid system source: ${props.systemSource}`);
    }

    return new ExternalReference(props);
  }

  // Getters
  public get externalSalesOrderId(): string | undefined {
    return this._externalSalesOrderId;
  }

  public get externalProjectId(): string | undefined {
    return this._externalProjectId;
  }

  public get externalLeadId(): string | undefined {
    return this._externalLeadId;
  }

  public get systemSource(): SalesSystem {
    return this._systemSource;
  }

  /**
   * Check if this reference has a sales order ID
   */
  public hasSalesOrderId(): boolean {
    return !!this._externalSalesOrderId;
  }

  /**
   * Check if this reference has a project ID
   */
  public hasProjectId(): boolean {
    return !!this._externalProjectId;
  }

  /**
   * Check if this reference has a lead ID
   */
  public hasLeadId(): boolean {
    return !!this._externalLeadId;
  }

  /**
   * Value objects are compared by value, not identity
   */
  public equals(other: ExternalReference): boolean {
    if (!other) return false;
    return (
      this._externalSalesOrderId === other._externalSalesOrderId &&
      this._externalProjectId === other._externalProjectId &&
      this._externalLeadId === other._externalLeadId &&
      this._systemSource === other._systemSource
    );
  }

  /**
   * Serialize to plain object for persistence
   */
  public toObject(): ExternalReferenceProps {
    return {
      externalSalesOrderId: this._externalSalesOrderId,
      externalProjectId: this._externalProjectId,
      externalLeadId: this._externalLeadId,
      systemSource: this._systemSource,
    };
  }

  /**
   * Create from database row
   */
  public static fromDatabase(data: {
    external_sales_order_id?: string;
    external_project_id?: string;
    external_lead_id?: string;
    external_system_source: string;
  }): ExternalReference {
    return ExternalReference.create({
      externalSalesOrderId: data.external_sales_order_id,
      externalProjectId: data.external_project_id,
      externalLeadId: data.external_lead_id,
      systemSource: data.external_system_source as SalesSystem,
    });
  }
}
