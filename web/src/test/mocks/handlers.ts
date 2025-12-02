/**
 * MSW Request Handlers
 * Mock API responses for testing
 * 
 * IMPORTANT: All responses are wrapped in { data: ..., meta: ... } 
 * to match the real API response structure.
 */

import { http, HttpResponse } from 'msw';

const API_BASE_URL = 'http://localhost:3001/api/v1';

// Helper to wrap response in standard API format
const wrapResponse = <T>(data: T, meta?: any) => ({
  data,
  meta: meta || { timestamp: new Date().toISOString(), correlationId: 'test-correlation-id' },
});

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'operator@yellowgrid.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'OPERATOR', // Singular for backward compatibility
  roles: ['OPERATOR'], // Array for API compatibility
  countryCode: 'FR',
  businessUnit: 'LEROY_MERLIN',
  userType: 'INTERNAL',
  permissions: ['service-orders:read', 'service-orders:write', 'assignments:read'],
  providerId: null,
  workTeamId: null,
  mfaEnabled: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockServiceOrders = [
  {
    id: 'so-1',
    externalId: 'SO-2024-001',
    serviceType: 'TECHNICAL_VISIT',
    status: 'SCHEDULED',
    urgency: 'URGENT',
    customerName: 'Marie Dubois',
    customerAddress: '123 Rue de Rivoli, Paris',
    scheduledDate: '2024-02-15T10:00:00Z',
    estimatedDuration: 2,
    salesPotential: 'HIGH',
    riskLevel: 'LOW',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'so-2',
    externalId: 'SO-2024-002',
    serviceType: 'INSTALLATION',
    status: 'CREATED',
    urgency: 'STANDARD',
    customerName: 'Jean Martin',
    customerAddress: '456 Avenue des Champs, Lyon',
    salesPotential: 'MEDIUM',
    riskLevel: 'MEDIUM',
    createdAt: '2024-01-16T09:00:00Z',
  },
];

const mockProviders = [
  {
    id: 'provider-1',
    name: 'TechPro Services',
    email: 'contact@techpro.fr',
    phone: '+33123456789',
    status: 'ACTIVE',
    countryCode: 'FR',
    serviceTypes: ['Installation', 'Maintenance'],
    coverageZones: ['Paris', 'Ile-de-France'],
  },
];

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'operator@yellowgrid.com' && body.password === 'password123') {
      return HttpResponse.json(wrapResponse({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: mockUser,
      }));
    }

    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  http.get(`${API_BASE_URL}/auth/me`, () => {
    return HttpResponse.json(wrapResponse({
      userId: mockUser.id,
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      userType: mockUser.userType,
      countryCode: mockUser.countryCode,
      businessUnit: mockUser.businessUnit,
      providerId: mockUser.providerId,
      workTeamId: mockUser.workTeamId,
      roles: mockUser.roles,
      authMethod: 'local',
    }));
  }),

  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json(wrapResponse({ message: 'Logged out successfully' }));
  }),

  http.post(`${API_BASE_URL}/auth/refresh`, () => {
    return HttpResponse.json(wrapResponse({
      accessToken: 'new-mock-access-token',
    }));
  }),

  // Service Orders endpoints
  http.get(`${API_BASE_URL}/service-orders`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let filtered = mockServiceOrders;
    if (status) {
      filtered = mockServiceOrders.filter((so) => so.status === status);
    }

    return HttpResponse.json(wrapResponse(filtered, {
      pagination: {
        total: filtered.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    }));
  }),

  http.get(`${API_BASE_URL}/service-orders/:id`, ({ params }) => {
    const order = mockServiceOrders.find((so) => so.id === params.id);

    if (!order) {
      return HttpResponse.json({ message: 'Service order not found' }, { status: 404 });
    }

    return HttpResponse.json(wrapResponse({
      ...order,
      // Add additional detail fields
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
      storeId: 'store-1',
      projectId: 'project-1',
      // Customer information
      customerPhone: '+33123456789',
      customerEmail: 'customer@example.com',
      // AI features
      salesPotentialScore: 0.85,
      salesPreEstimationValue: 5000,
      salesmanNotes: 'Customer interested in premium options',
      salesPotentialUpdatedAt: '2024-01-15T10:00:00Z',
      riskScore: 0.22,
      riskFactors: { 'First-time customer': true, 'Complex installation': false },
      riskAssessedAt: '2024-01-15T10:00:00Z',
      // Go Exec
      goExecStatus: 'OK',
      paymentStatus: 'PAID',
      productDeliveryStatus: 'DELIVERED',
    }));
  }),

  // Providers endpoints
  http.get(`${API_BASE_URL}/providers`, () => {
    return HttpResponse.json(wrapResponse(mockProviders, {
      pagination: {
        total: mockProviders.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    }));
  }),

  http.get(`${API_BASE_URL}/providers/:id`, ({ params }) => {
    const provider = mockProviders.find((p) => p.id === params.id);

    if (!provider) {
      return HttpResponse.json({ message: 'Provider not found' }, { status: 404 });
    }

    return HttpResponse.json(wrapResponse(provider));
  }),

  http.post(`${API_BASE_URL}/providers`, async ({ request }) => {
    const body = await request.json() as any;

    return HttpResponse.json(wrapResponse({
      id: 'provider-new',
      ...body,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    }), { status: 201 });
  }),

  // Assignments endpoints
  http.get(`${API_BASE_URL}/assignments`, () => {
    return HttpResponse.json(wrapResponse([
      {
        id: 'assignment-1',
        serviceOrderId: 'so-1',
        providerId: 'provider-1',
        status: 'ACCEPTED',
        mode: 'DIRECT',
        createdAt: '2024-01-15T11:00:00Z',
      },
    ], {
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    }));
  }),

  http.get(`${API_BASE_URL}/assignments/:id`, ({ params }) => {
    return HttpResponse.json(wrapResponse({
      id: params.id,
      serviceOrderId: 'so-1',
      providerId: 'provider-1',
      status: 'ACCEPTED',
      mode: 'DIRECT',
      createdAt: '2024-01-15T11:00:00Z',
      offeredAt: '2024-01-15T11:05:00Z',
      acceptedAt: '2024-01-15T11:30:00Z',
      scoringResult: {
        totalScore: 8.5,
        factors: [
          {
            name: 'Distance',
            score: 9,
            weight: 0.3,
            rationale: 'Provider is 5km from customer location',
          },
          {
            name: 'Skills Match',
            score: 10,
            weight: 0.25,
            rationale: 'Provider has all required certifications',
          },
          {
            name: 'Availability',
            score: 7,
            weight: 0.25,
            rationale: 'Provider has 60% availability',
          },
        ],
      },
      provider: {
        id: 'provider-1',
        name: 'TechPro Services',
      },
      serviceOrder: {
        id: 'so-1',
        externalId: 'SO-2024-001',
      },
    }));
  }),

  http.post(`${API_BASE_URL}/assignments`, async ({ request }) => {
    const body = await request.json() as any;

    return HttpResponse.json(wrapResponse({
      id: 'assignment-new',
      ...body,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    }), { status: 201 });
  }),

  // Calendar endpoints
  http.get(`${API_BASE_URL}/calendar/scheduled-orders`, () => {
    return HttpResponse.json(wrapResponse(
      mockServiceOrders.filter((so) => so.scheduledDate)
    ));
  }),

  http.get(`${API_BASE_URL}/calendar/availability`, () => {
    return HttpResponse.json(wrapResponse([
      {
        providerId: 'provider-1',
        providerName: 'TechPro Services',
        date: '2024-02-15',
        totalAvailableHours: 8,
        utilization: 0.5,
        slots: [
          {
            id: 'slot-1',
            providerId: 'provider-1',
            startTime: '2024-02-15T09:00:00Z',
            endTime: '2024-02-15T12:00:00Z',
            status: 'available',
          },
        ],
      },
    ]));
  }),
];
