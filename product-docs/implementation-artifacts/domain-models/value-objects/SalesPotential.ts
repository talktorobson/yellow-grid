/**
 * Sales Potential Value Object
 *
 * Represents the AI-assessed sales potential for TV/Quotation service orders.
 * Combines potential level (LOW/MEDIUM/HIGH), score (0-100), and confidence.
 *
 * @see product-docs/domain/10-ai-context-linking.md (v2.0)
 */

export enum PotentialLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface SalesPotentialProps {
  potential: PotentialLevel;
  score: number; // 0-100
  confidence: number; // 0-100
  assessedAt: Date;
  modelVersion?: string;
}

export class SalesPotential {
  private readonly _potential: PotentialLevel;
  private readonly _score: number;
  private readonly _confidence: number;
  private readonly _assessedAt: Date;
  private readonly _modelVersion?: string;

  private constructor(props: SalesPotentialProps) {
    this._potential = props.potential;
    this._score = props.score;
    this._confidence = props.confidence;
    this._assessedAt = props.assessedAt;
    this._modelVersion = props.modelVersion;
  }

  /**
   * Factory method to create SalesPotential
   * Validates score, confidence, and potential level alignment
   */
  public static create(props: SalesPotentialProps): SalesPotential {
    // Validate potential level
    if (!Object.values(PotentialLevel).includes(props.potential)) {
      throw new Error(`Invalid sales potential level: ${props.potential}`);
    }

    // Validate score range (0-100)
    if (props.score < 0 || props.score > 100) {
      throw new Error('Sales potential score must be between 0 and 100');
    }

    // Validate confidence range (0-100)
    if (props.confidence < 0 || props.confidence > 100) {
      throw new Error('Sales potential confidence must be between 0 and 100');
    }

    // Business rule: Ensure potential level aligns with score
    const expectedLevel = SalesPotential.scoreToLevel(props.score);
    if (expectedLevel !== props.potential) {
      throw new Error(
        `Potential level ${props.potential} does not match score ${props.score} (expected ${expectedLevel})`
      );
    }

    return new SalesPotential(props);
  }

  /**
   * Convert score to potential level
   * Business rules: LOW (0-33), MEDIUM (34-66), HIGH (67-100)
   */
  public static scoreToLevel(score: number): PotentialLevel {
    if (score <= 33) return PotentialLevel.LOW;
    if (score <= 66) return PotentialLevel.MEDIUM;
    return PotentialLevel.HIGH;
  }

  /**
   * Create from score and confidence (auto-determine level)
   */
  public static fromScore(score: number, confidence: number, modelVersion?: string): SalesPotential {
    const potential = SalesPotential.scoreToLevel(score);
    return SalesPotential.create({
      potential,
      score,
      confidence,
      assessedAt: new Date(),
      modelVersion,
    });
  }

  // Getters
  public get potential(): PotentialLevel {
    return this._potential;
  }

  public get score(): number {
    return this._score;
  }

  public get confidence(): number {
    return this._confidence;
  }

  public get assessedAt(): Date {
    return this._assessedAt;
  }

  public get modelVersion(): string | undefined {
    return this._modelVersion;
  }

  /**
   * Check if this is high potential
   */
  public isHighPotential(): boolean {
    return this._potential === PotentialLevel.HIGH;
  }

  /**
   * Check if assessment is confident (>80% confidence)
   */
  public isConfident(): boolean {
    return this._confidence >= 80;
  }

  /**
   * Check if assessment needs review (low confidence)
   */
  public needsReview(): boolean {
    return this._confidence < 60;
  }

  /**
   * Check if assessment is stale (>7 days old)
   */
  public isStale(currentDate: Date = new Date()): boolean {
    const daysSinceAssessment = (currentDate.getTime() - this._assessedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceAssessment > 7;
  }

  /**
   * Value objects are compared by value
   */
  public equals(other: SalesPotential): boolean {
    if (!other) return false;
    return (
      this._potential === other._potential &&
      this._score === other._score &&
      this._confidence === other._confidence
    );
  }

  /**
   * Serialize to plain object
   */
  public toObject(): SalesPotentialProps {
    return {
      potential: this._potential,
      score: this._score,
      confidence: this._confidence,
      assessedAt: this._assessedAt,
      modelVersion: this._modelVersion,
    };
  }

  /**
   * Create from database columns
   */
  public static fromDatabase(data: {
    sales_potential: string;
    sales_potential_score: number;
    sales_potential_confidence?: number;
    sales_potential_updated_at: Date;
    sales_potential_model_version?: string;
  }): SalesPotential {
    return SalesPotential.create({
      potential: data.sales_potential as PotentialLevel,
      score: data.sales_potential_score,
      confidence: data.sales_potential_confidence || 0,
      assessedAt: data.sales_potential_updated_at,
      modelVersion: data.sales_potential_model_version,
    });
  }
}
