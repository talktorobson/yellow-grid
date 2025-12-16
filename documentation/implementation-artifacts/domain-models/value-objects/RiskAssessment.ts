/**
 * Risk Assessment Value Object
 *
 * Represents the AI-assessed risk level for a service order.
 * Combines risk level, score, factors, and acknowledgment status.
 *
 * @see documentation/domain/10-ai-context-linking.md (v2.0)
 */

import { RiskFactor, RiskSeverity } from './RiskFactor';

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface RiskAssessmentProps {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  confidence: number; // 0-100
  riskFactors: RiskFactor[];
  assessedAt: Date;
  triggeredBy: string; // 'SYSTEM' or user ID
  modelVersion?: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  acknowledgmentNotes?: string;
}

export class RiskAssessment {
  private readonly _riskLevel: RiskLevel;
  private readonly _riskScore: number;
  private readonly _confidence: number;
  private readonly _riskFactors: RiskFactor[];
  private readonly _assessedAt: Date;
  private readonly _triggeredBy: string;
  private readonly _modelVersion?: string;
  private readonly _isAcknowledged: boolean;
  private readonly _acknowledgedBy?: string;
  private readonly _acknowledgedAt?: Date;
  private readonly _acknowledgmentNotes?: string;

  private constructor(props: RiskAssessmentProps) {
    this._riskLevel = props.riskLevel;
    this._riskScore = props.riskScore;
    this._confidence = props.confidence;
    this._riskFactors = props.riskFactors;
    this._assessedAt = props.assessedAt;
    this._triggeredBy = props.triggeredBy;
    this._modelVersion = props.modelVersion;
    this._isAcknowledged = props.isAcknowledged;
    this._acknowledgedBy = props.acknowledgedBy;
    this._acknowledgedAt = props.acknowledgedAt;
    this._acknowledgmentNotes = props.acknowledgmentNotes;
  }

  /**
   * Factory method to create RiskAssessment
   */
  public static create(props: RiskAssessmentProps): RiskAssessment {
    // Validate risk level
    if (!Object.values(RiskLevel).includes(props.riskLevel)) {
      throw new Error(`Invalid risk level: ${props.riskLevel}`);
    }

    // Validate score range (0-100)
    if (props.riskScore < 0 || props.riskScore > 100) {
      throw new Error('Risk score must be between 0 and 100');
    }

    // Validate confidence range (0-100)
    if (props.confidence < 0 || props.confidence > 100) {
      throw new Error('Risk confidence must be between 0 and 100');
    }

    // Business rule: Ensure risk level aligns with score
    const expectedLevel = RiskAssessment.scoreToLevel(props.riskScore);
    if (expectedLevel !== props.riskLevel) {
      throw new Error(
        `Risk level ${props.riskLevel} does not match score ${props.riskScore} (expected ${expectedLevel})`
      );
    }

    // Business rule: If acknowledged, must have acknowledgedBy and acknowledgedAt
    if (props.isAcknowledged) {
      if (!props.acknowledgedBy || !props.acknowledgedAt) {
        throw new Error('Acknowledged risk must have acknowledgedBy and acknowledgedAt');
      }
    }

    return new RiskAssessment(props);
  }

  /**
   * Convert score to risk level
   * Business rules: LOW (0-25), MEDIUM (26-50), HIGH (51-75), CRITICAL (76-100)
   */
  public static scoreToLevel(score: number): RiskLevel {
    if (score <= 25) return RiskLevel.LOW;
    if (score <= 50) return RiskLevel.MEDIUM;
    if (score <= 75) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  /**
   * Create from score and factors (auto-determine level)
   */
  public static fromScore(
    score: number,
    confidence: number,
    riskFactors: RiskFactor[],
    triggeredBy: string,
    modelVersion?: string
  ): RiskAssessment {
    const riskLevel = RiskAssessment.scoreToLevel(score);
    return RiskAssessment.create({
      riskLevel,
      riskScore: score,
      confidence,
      riskFactors,
      assessedAt: new Date(),
      triggeredBy,
      modelVersion,
      isAcknowledged: false,
    });
  }

  // Getters
  public get riskLevel(): RiskLevel {
    return this._riskLevel;
  }

  public get riskScore(): number {
    return this._riskScore;
  }

  public get confidence(): number {
    return this._confidence;
  }

  public get riskFactors(): RiskFactor[] {
    return [...this._riskFactors]; // Return copy to maintain immutability
  }

  public get assessedAt(): Date {
    return this._assessedAt;
  }

  public get triggeredBy(): string {
    return this._triggeredBy;
  }

  public get modelVersion(): string | undefined {
    return this._modelVersion;
  }

  public get isAcknowledged(): boolean {
    return this._isAcknowledged;
  }

  public get acknowledgedBy(): string | undefined {
    return this._acknowledgedBy;
  }

  public get acknowledgedAt(): Date | undefined {
    return this._acknowledgedAt;
  }

  public get acknowledgmentNotes(): string | undefined {
    return this._acknowledgmentNotes;
  }

  /**
   * Business rule: HIGH/CRITICAL risk requires acknowledgment before check-in
   */
  public requiresAcknowledgment(): boolean {
    return this._riskLevel === RiskLevel.HIGH || this._riskLevel === RiskLevel.CRITICAL;
  }

  /**
   * Check if risk is high or critical
   */
  public isHighRisk(): boolean {
    return this.requiresAcknowledgment();
  }

  /**
   * Check if risk blocks operations (HIGH/CRITICAL and not acknowledged)
   */
  public blocksOperations(): boolean {
    return this.requiresAcknowledgment() && !this._isAcknowledged;
  }

  /**
   * Get critical risk factors
   */
  public getCriticalFactors(): RiskFactor[] {
    return this._riskFactors.filter((factor) => factor.isCritical());
  }

  /**
   * Get high-severity risk factors
   */
  public getHighSeverityFactors(): RiskFactor[] {
    return this._riskFactors.filter((factor) => factor.isHighSeverity());
  }

  /**
   * Acknowledge this risk assessment
   * Returns a new RiskAssessment with acknowledgment (immutable)
   */
  public acknowledge(acknowledgedBy: string, notes?: string): RiskAssessment {
    if (this._isAcknowledged) {
      throw new Error('Risk assessment is already acknowledged');
    }

    if (!this.requiresAcknowledgment()) {
      throw new Error('Only HIGH or CRITICAL risk requires acknowledgment');
    }

    return new RiskAssessment({
      ...this.toObject(),
      isAcknowledged: true,
      acknowledgedBy,
      acknowledgedAt: new Date(),
      acknowledgmentNotes: notes,
    });
  }

  /**
   * Value objects are compared by value (excluding acknowledgment)
   */
  public equals(other: RiskAssessment): boolean {
    if (!other) return false;
    return (
      this._riskLevel === other._riskLevel &&
      this._riskScore === other._riskScore &&
      this._confidence === other._confidence
    );
  }

  /**
   * Serialize to plain object
   */
  public toObject(): RiskAssessmentProps {
    return {
      riskLevel: this._riskLevel,
      riskScore: this._riskScore,
      confidence: this._confidence,
      riskFactors: this._riskFactors.map((f) => f), // Keep RiskFactor instances
      assessedAt: this._assessedAt,
      triggeredBy: this._triggeredBy,
      modelVersion: this._modelVersion,
      isAcknowledged: this._isAcknowledged,
      acknowledgedBy: this._acknowledgedBy,
      acknowledgedAt: this._acknowledgedAt,
      acknowledgmentNotes: this._acknowledgmentNotes,
    };
  }

  /**
   * Create from database columns
   */
  public static fromDatabase(data: {
    risk_level: string;
    risk_score: number;
    risk_confidence?: number;
    risk_factors: any; // JSONB
    risk_assessed_at: Date;
    risk_triggered_by?: string;
    risk_model_version?: string;
    risk_acknowledged_by?: string;
    risk_acknowledged_at?: Date;
    risk_acknowledgment_notes?: string;
  }): RiskAssessment {
    const riskFactors = RiskFactor.fromDatabaseArray(data.risk_factors || []);

    return RiskAssessment.create({
      riskLevel: data.risk_level as RiskLevel,
      riskScore: data.risk_score,
      confidence: data.risk_confidence || 0,
      riskFactors,
      assessedAt: data.risk_assessed_at,
      triggeredBy: data.risk_triggered_by || 'SYSTEM',
      modelVersion: data.risk_model_version,
      isAcknowledged: !!data.risk_acknowledged_by,
      acknowledgedBy: data.risk_acknowledged_by,
      acknowledgedAt: data.risk_acknowledged_at,
      acknowledgmentNotes: data.risk_acknowledgment_notes,
    });
  }
}
