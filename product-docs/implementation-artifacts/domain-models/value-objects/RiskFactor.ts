/**
 * Risk Factor Value Object
 *
 * Represents an individual risk factor identified by the AI Risk Assessment model.
 * Each factor contributes to the overall risk score with a specific weight and severity.
 *
 * @see product-docs/domain/10-ai-context-linking.md (v2.0)
 */

export enum RiskSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface RiskFactorProps {
  factor: string;
  description: string;
  weight: number; // 0-1, contribution to overall score
  severity: RiskSeverity;
}

export class RiskFactor {
  private readonly _factor: string;
  private readonly _description: string;
  private readonly _weight: number;
  private readonly _severity: RiskSeverity;

  private constructor(props: RiskFactorProps) {
    this._factor = props.factor;
    this._description = props.description;
    this._weight = props.weight;
    this._severity = props.severity;
  }

  /**
   * Factory method to create RiskFactor
   * Validates weight and severity
   */
  public static create(props: RiskFactorProps): RiskFactor {
    // Validate factor name
    if (!props.factor || props.factor.trim().length === 0) {
      throw new Error('Risk factor name cannot be empty');
    }

    // Validate description
    if (!props.description || props.description.trim().length === 0) {
      throw new Error('Risk factor description cannot be empty');
    }

    // Validate weight (0-1 range)
    if (props.weight < 0 || props.weight > 1) {
      throw new Error('Risk factor weight must be between 0 and 1');
    }

    // Validate severity
    if (!Object.values(RiskSeverity).includes(props.severity)) {
      throw new Error(`Invalid risk severity: ${props.severity}`);
    }

    return new RiskFactor(props);
  }

  // Getters
  public get factor(): string {
    return this._factor;
  }

  public get description(): string {
    return this._description;
  }

  public get weight(): number {
    return this._weight;
  }

  public get severity(): RiskSeverity {
    return this._severity;
  }

  /**
   * Check if this is a high-severity risk factor
   */
  public isHighSeverity(): boolean {
    return this._severity === RiskSeverity.HIGH || this._severity === RiskSeverity.CRITICAL;
  }

  /**
   * Check if this is a critical risk factor
   */
  public isCritical(): boolean {
    return this._severity === RiskSeverity.CRITICAL;
  }

  /**
   * Get numeric severity score (1-4)
   */
  public getSeverityScore(): number {
    switch (this._severity) {
      case RiskSeverity.LOW:
        return 1;
      case RiskSeverity.MEDIUM:
        return 2;
      case RiskSeverity.HIGH:
        return 3;
      case RiskSeverity.CRITICAL:
        return 4;
      default:
        return 1;
    }
  }

  /**
   * Value objects are compared by value
   */
  public equals(other: RiskFactor): boolean {
    if (!other) return false;
    return (
      this._factor === other._factor &&
      this._weight === other._weight &&
      this._severity === other._severity
    );
  }

  /**
   * Serialize to plain object
   */
  public toObject(): RiskFactorProps {
    return {
      factor: this._factor,
      description: this._description,
      weight: this._weight,
      severity: this._severity,
    };
  }

  /**
   * Create from database JSONB
   */
  public static fromDatabase(data: {
    factor: string;
    description: string;
    weight: number;
    severity: string;
  }): RiskFactor {
    return RiskFactor.create({
      factor: data.factor,
      description: data.description,
      weight: data.weight,
      severity: data.severity as RiskSeverity,
    });
  }

  /**
   * Create multiple risk factors from database array
   */
  public static fromDatabaseArray(data: any[]): RiskFactor[] {
    if (!Array.isArray(data)) return [];
    return data.map((item) => RiskFactor.fromDatabase(item));
  }
}
