import { User, UserRole, AuthTokens } from '@/types/auth.types';
import { ServiceOrder, ServiceType, Priority, ServiceOrderStatus } from '@/types/service-order.types';
import { CheckIn, CheckInMethod, CheckInStatus, HazardType } from '@/types/checkin-checkout.types';

// Mock User Data
export const mockUser: User = {
  id: 'user-123',
  email: 'technician@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.TECHNICIAN,
  countryCode: 'FR',
  businessUnit: 'LEROY_MERLIN',
  workTeamId: 'team-456',
  providerId: 'provider-789',
  permissions: ['service_orders:read', 'service_orders:update', 'check_ins:create', 'check_outs:create'],
};

// Mock Login Credentials
export const mockCredentials = {
  email: 'technician@example.com',
  password: 'password123',
};

// Mock Auth Tokens
export const mockTokens: AuthTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
};

// Mock Auth Response
export const mockAuthResponse = {
  ...mockTokens,
  user: mockUser,
};

// Mock Service Order Data
export const mockServiceOrder: ServiceOrder = {
  id: 'so-123',
  orderNumber: 'SO-2025-001',
  projectId: 'project-456',
  projectName: 'Kitchen Renovation - Dubois',
  status: ServiceOrderStatus.ASSIGNED,
  customer: {
    id: 'customer-123',
    firstName: 'Marie',
    lastName: 'Dubois',
    email: 'marie.dubois@example.com',
    phone: '+33612345678',
    preferredContactMethod: 'PHONE',
  },
  siteAddress: {
    street: '123 Rue de la Paix',
    city: 'Paris',
    postalCode: '75001',
    country: 'FR',
    coordinates: {
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 10,
      timestamp: '2025-01-20T09:00:00Z',
    },
  },
  scheduledDate: '2025-01-20',
  scheduledTimeSlot: {
    start: '09:00',
    end: '12:00',
    timezone: 'Europe/Paris',
  },
  estimatedDuration: 180,
  serviceType: ServiceType.INSTALLATION,
  priority: Priority.P2,
  serviceDescription: 'Kitchen cabinet installation',
  products: [
    {
      id: 'product-1',
      name: 'Kitchen Cabinet Installation',
      quantity: 1,
      sku: 'CAB-001',
      category: 'Kitchen',
      unitPrice: 1200,
    },
  ],
  assignedWorkTeamId: 'team-456',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
  createdBy: 'operator-123',
};

// Mock Service Order List
export const mockServiceOrders: ServiceOrder[] = [
  mockServiceOrder,
  {
    ...mockServiceOrder,
    id: 'so-124',
    orderNumber: 'SO-2025-002',
    projectId: 'project-457',
    projectName: 'Bathroom Renovation - Martin',
    status: ServiceOrderStatus.ACCEPTED,
    customer: {
      id: 'customer-124',
      firstName: 'Pierre',
      lastName: 'Martin',
      email: 'pierre.martin@example.com',
      phone: '+33698765432',
      preferredContactMethod: 'EMAIL',
    },
    siteAddress: {
      street: '456 Avenue des Champs-Élysées',
      city: 'Paris',
      postalCode: '75008',
      country: 'FR',
      coordinates: {
        latitude: 48.8698,
        longitude: 2.3078,
        accuracy: 10,
        timestamp: '2025-01-19T09:00:00Z',
      },
    },
    priority: Priority.P1,
    scheduledDate: '2025-01-19',
  },
  {
    ...mockServiceOrder,
    id: 'so-125',
    orderNumber: 'SO-2025-003',
    projectId: 'project-458',
    projectName: 'Floor Installation - Bernard',
    status: ServiceOrderStatus.IN_PROGRESS,
    customer: {
      id: 'customer-125',
      firstName: 'Sophie',
      lastName: 'Bernard',
      email: 'sophie.bernard@example.com',
      phone: '+33687654321',
      preferredContactMethod: 'SMS',
    },
    siteAddress: {
      street: '789 Boulevard Saint-Germain',
      city: 'Lyon',
      postalCode: '69001',
      country: 'FR',
      coordinates: {
        latitude: 45.7640,
        longitude: 4.8357,
        accuracy: 10,
        timestamp: '2025-01-18T09:00:00Z',
      },
    },
    scheduledDate: '2025-01-18',
  },
];

// Mock Check-In Data
export const mockCheckIn: CheckIn = {
  id: 'checkin-123',
  serviceOrderId: 'so-123',
  technicianId: 'user-123',
  scheduledArrivalWindow: {
    start: '2025-01-20T09:00:00Z',
    end: '2025-01-20T12:00:00Z',
  },
  actualArrivalTime: '2025-01-20T08:55:00Z',
  checkInTime: '2025-01-20T09:00:00Z',
  checkInMethod: CheckInMethod.GPS_AUTO,
  location: {
    latitude: 48.8566,
    longitude: 2.3522,
    altitude: 35,
    accuracy: 10,
    timestamp: '2025-01-20T09:00:00Z',
  },
  locationAccuracy: 10,
  locationVerified: true,
  arrivalPhotos: [],
  customerPresent: true,
  siteAccessNotes: 'Access via main entrance',
  safetyHazards: [
    {
      type: HazardType.ELECTRICAL,
      description: 'Exposed wiring in utility room',
      severity: 'MEDIUM',
      mitigationActions: ['Turn off power before working', 'Use insulated tools'],
      reportedAt: '2025-01-20T09:05:00Z',
    },
  ],
  status: CheckInStatus.ON_SITE,
  metadata: {
    deviceId: 'device-123',
    deviceModel: 'iPhone 13',
    osVersion: 'iOS 16.0',
    appVersion: '1.0.0',
    batteryLevel: 85,
    networkStatus: 'ONLINE',
  },
  createdAt: '2025-01-20T09:00:00Z',
};

// Mock GPS Location
export const mockLocation = {
  coords: {
    latitude: 48.8566,
    longitude: 2.3522,
    altitude: 35,
    accuracy: 10,
    altitudeAccuracy: 5,
    heading: 0,
    speed: 0,
  },
  timestamp: Date.now(),
};

// Mock API Error Responses
export const mockApiErrors = {
  unauthorized: {
    response: {
      status: 401,
      data: {
        error: 'Unauthorized',
        message: 'Invalid credentials',
      },
    },
  },
  notFound: {
    response: {
      status: 404,
      data: {
        error: 'Not Found',
        message: 'Resource not found',
      },
    },
  },
  serverError: {
    response: {
      status: 500,
      data: {
        error: 'Internal Server Error',
        message: 'Something went wrong',
      },
    },
  },
  networkError: {
    message: 'Network Error',
    isAxiosError: true,
    code: 'NETWORK_ERROR',
  },
};
