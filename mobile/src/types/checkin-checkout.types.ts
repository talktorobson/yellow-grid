import { GeoLocation } from './service-order.types';

export interface CheckIn {
  id: string;
  serviceOrderId: string;
  technicianId: string;
  scheduledArrivalWindow: {
    start: string;
    end: string;
  };
  actualArrivalTime: string;
  checkInTime: string;
  checkInMethod: CheckInMethod;
  location: GeoLocation;
  locationAccuracy: number;
  locationVerified: boolean;
  arrivalPhotos: Photo[];
  customerPresent: boolean;
  customerSignature?: Signature;
  siteAccessNotes?: string;
  safetyHazards: SafetyHazard[];
  status: CheckInStatus;
  metadata: DeviceMetadata;
  createdAt: string;
  syncedAt?: string;
}

export interface CheckOut {
  id: string;
  serviceOrderId: string;
  checkInId: string;
  technicianId: string;
  checkOutTime: string;
  completionStatus: CompletionStatus;
  workPerformed: WorkSummary;
  materialsUsed: MaterialUsage[];
  departurePhotos: Photo[];
  customerSignature?: Signature;
  customerFeedback?: CustomerFeedback;
  nextVisitRequired: boolean;
  nextVisitReason?: string;
  location: GeoLocation;
  status: CheckOutStatus;
  metadata: DeviceMetadata;
  createdAt: string;
  syncedAt?: string;
}

export enum CheckInMethod {
  GPS_AUTO = 'GPS_AUTO',
  MANUAL = 'MANUAL',
  QR_CODE = 'QR_CODE',
  NFC = 'NFC',
  BEACON = 'BEACON',
}

export enum CheckInStatus {
  PENDING = 'PENDING',
  ON_SITE = 'ON_SITE',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum CheckOutStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
}

export enum CompletionStatus {
  COMPLETED = 'COMPLETED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  INCOMPLETE = 'INCOMPLETE',
  CANCELLED = 'CANCELLED',
}

export interface Photo {
  id: string;
  uri: string;
  type: 'arrival' | 'work_in_progress' | 'completion' | 'issue';
  caption?: string;
  timestamp: string;
  location?: GeoLocation;
  uploaded: boolean;
  uploadedUrl?: string;
}

export interface Signature {
  id: string;
  signatureData: string; // Base64 encoded
  signedBy: string;
  signedAt: string;
  ipAddress?: string;
}

export interface SafetyHazard {
  type: HazardType;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigationActions: string[];
  reportedAt: string;
}

export enum HazardType {
  ELECTRICAL = 'ELECTRICAL',
  STRUCTURAL = 'STRUCTURAL',
  CHEMICAL = 'CHEMICAL',
  BIOLOGICAL = 'BIOLOGICAL',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  EQUIPMENT = 'EQUIPMENT',
  ACCESS = 'ACCESS',
}

export interface WorkSummary {
  description: string;
  tasksCompleted: string[];
  issuesEncountered: string[];
  workDuration: number; // minutes
  breakDuration: number; // minutes
}

export interface MaterialUsage {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface CustomerFeedback {
  rating: number; // 1-5
  comments?: string;
  wouldRecommend: boolean;
}

export interface DeviceMetadata {
  deviceId: string;
  appVersion: string;
  networkStatus: 'ONLINE' | 'OFFLINE';
  batteryLevel: number;
  osVersion: string;
  deviceModel: string;
}
