export * from './externalReferences.service';
import { ExternalReferencesService } from './externalReferences.service';
export * from './externalReferences.serviceInterface'
export * from './projectOwnership.service';
import { ProjectOwnershipService } from './projectOwnership.service';
export * from './projectOwnership.serviceInterface'
export * from './riskAssessment.service';
import { RiskAssessmentService } from './riskAssessment.service';
export * from './riskAssessment.serviceInterface'
export * from './salesPotential.service';
import { SalesPotentialService } from './salesPotential.service';
export * from './salesPotential.serviceInterface'
export const APIS = [ExternalReferencesService, ProjectOwnershipService, RiskAssessmentService, SalesPotentialService];
