import { ApiProperty } from '@nestjs/swagger';
import {
  ServiceOrderState,
  ServicePriority,
  ServiceType,
  SalesPotential,
  RiskLevel,
} from '@prisma/client';

export class ServiceOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  externalServiceOrderId?: string;

  @ApiProperty({ required: false })
  projectId?: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty({ required: false })
  assignedProviderId?: string;

  @ApiProperty({ required: false })
  assignedWorkTeamId?: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty()
  businessUnit: string;

  @ApiProperty()
  customerInfo: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };

  @ApiProperty({ enum: ServiceType })
  serviceType: ServiceType;

  @ApiProperty({ enum: ServicePriority })
  priority: ServicePriority;

  @ApiProperty()
  estimatedDurationMinutes: number;

  @ApiProperty()
  serviceAddress: {
    street: string;
    city: string;
    postalCode: string;
    lat?: number;
    lng?: number;
  };

  @ApiProperty()
  requestedStartDate: Date;

  @ApiProperty()
  requestedEndDate: Date;

  @ApiProperty({ required: false })
  requestedTimeSlot?: string;

  @ApiProperty({ required: false })
  scheduledDate?: Date;

  @ApiProperty({ required: false })
  scheduledStartTime?: Date;

  @ApiProperty({ required: false })
  scheduledEndTime?: Date;

  @ApiProperty({ required: false })
  externalSalesOrderId?: string;

  @ApiProperty({ required: false })
  externalProjectId?: string;

  @ApiProperty({ required: false })
  externalLeadId?: string;

  @ApiProperty({ required: false })
  externalSystemSource?: string;

  @ApiProperty({ enum: SalesPotential, required: false })
  salesPotential?: SalesPotential;

  @ApiProperty({ required: false })
  salesPotentialScore?: number;

  @ApiProperty({ required: false })
  salesPotentialUpdatedAt?: Date;

  @ApiProperty({ required: false })
  salesPreEstimationId?: string;

  @ApiProperty({ required: false })
  salesPreEstimationValue?: number;

  @ApiProperty({ required: false })
  salesmanNotes?: string;

  @ApiProperty({ enum: RiskLevel })
  riskLevel: RiskLevel;

  @ApiProperty({ required: false })
  riskScore?: number;

  @ApiProperty({ required: false })
  riskAssessedAt?: Date;

  @ApiProperty({ required: false })
  riskAcknowledgedBy?: string;

  @ApiProperty({ required: false })
  riskAcknowledgedAt?: Date;

  @ApiProperty({ enum: ServiceOrderState })
  state: ServiceOrderState;

  @ApiProperty()
  stateChangedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;
}
