export interface ServiceOrder {
  id: string;
  orderNumber: string;
  projectId: string;
  projectName: string;
  serviceType: ServiceType;
  urgency: Urgency;
  status: ServiceOrderStatus;
  scheduledDate: string;
  scheduledTimeSlot: TimeWindow;
  estimatedDuration: number; // minutes

  // Customer information
  customer: Customer;
  siteAddress: Address;

  // Assignment information
  assignedProviderId?: string;
  assignedWorkTeamId?: string;
  assignedTechnicianIds?: string[];

  // Service details
  products: Product[];
  serviceDescription: string;
  specialInstructions?: string;

  // Execution tracking
  checkInId?: string;
  checkOutId?: string;
  executionStatus?: ExecutionStatus;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export enum ServiceType {
  TECHNICAL_VISIT = 'TECHNICAL_VISIT',
  INSTALLATION = 'INSTALLATION',
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
}

export enum Urgency {
  URGENT = 'URGENT',   // 24-48h response
  STANDARD = 'STANDARD', // 3-7 days
  LOW = 'LOW',         // flexible
}

export enum ServiceOrderStatus {
  CREATED = 'CREATED',
  SCHEDULED = 'SCHEDULED',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VALIDATED = 'VALIDATED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum ExecutionStatus {
  NOT_STARTED = 'NOT_STARTED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CHECKED_OUT = 'CHECKED_OUT',
}

export interface TimeWindow {
  start: string;
  end: string;
  timezone: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContactMethod: 'EMAIL' | 'PHONE' | 'SMS';
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  coordinates?: GeoLocation;
  accessInstructions?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  timestamp: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
}
