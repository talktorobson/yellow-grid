// Custom hook for customer portal access via deep-link token
import { useState, useEffect } from 'react';

interface ServiceOrderView {
  id: string;
  orderNumber: string;
  serviceName: string;
  serviceType: string;
  state: string;
  stateHistory: Array<{
    state: string;
    timestamp: string;
    actor?: string;
  }>;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  serviceAddress: {
    street: string;
    city: string;
    postalCode: string;
  };
  assignedProvider?: {
    name: string;
    phone?: string;
  };
  assignedWorkTeam?: {
    name: string;
    technicianName?: string;
    phone?: string;
  };
  lineItems?: Array<{
    id: string;
    lineType: 'PRODUCT' | 'SERVICE';
    name: string;
    quantity: number;
    deliveryStatus?: string;
    executionStatus?: string;
  }>;
  contract?: {
    id: string;
    status: string;
    signedAt?: string;
  };
  wcf?: {
    id: string;
    status: string;
    signedAt?: string;
  };
}

interface CustomerInfo {
  name: string;
  email?: string;
  phone?: string;
}

interface UseCustomerAccessResult {
  serviceOrder: ServiceOrderView | null;
  customer: CustomerInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCustomerAccess(accessToken: string): UseCustomerAccessResult {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrderView | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!accessToken) {
      setError('No access token provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Verify token and get service order
      const response = await fetch(`/api/v1/customer-portal/${accessToken}/service-order`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your access link has expired or is invalid. Please request a new one.');
        }
        if (response.status === 404) {
          throw new Error('Service order not found.');
        }
        throw new Error('Unable to load service details. Please try again later.');
      }

      const data = await response.json();
      setServiceOrder(data.serviceOrder);
      setCustomer(data.customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accessToken]);

  return {
    serviceOrder,
    customer,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// Helper hook for customer portal context
import { useOutletContext } from 'react-router-dom';

interface CustomerPortalContext {
  serviceOrder: ServiceOrderView;
  customer: CustomerInfo;
  accessToken: string;
}

export function useCustomerPortalContext(): CustomerPortalContext {
  return useOutletContext<CustomerPortalContext>();
}

// Actions for customer portal
export async function requestReschedule(
  accessToken: string,
  data: { preferredDate: string; reason: string }
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/v1/customer-portal/${accessToken}/reschedule-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to submit reschedule request');
  }

  return response.json();
}

export async function signContract(
  accessToken: string,
  data: { signature: string; agreedToTerms: boolean }
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/v1/customer-portal/${accessToken}/contract/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to sign contract');
  }

  return response.json();
}

export async function signWCF(
  accessToken: string,
  data: { signature: string; satisfaction: number; comments?: string }
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/v1/customer-portal/${accessToken}/wcf/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to sign work completion form');
  }

  return response.json();
}

export async function submitEvaluation(
  accessToken: string,
  data: { rating: number; feedback?: string; recommendToOthers?: boolean }
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/v1/customer-portal/${accessToken}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to submit evaluation');
  }

  return response.json();
}

export async function confirmProductArrival(
  accessToken: string,
  productIds: string[]
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/v1/customer-portal/${accessToken}/product-arrived`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to confirm product arrival');
  }

  return response.json();
}

export async function reportIssue(
  accessToken: string,
  data: { type: string; description: string; photos?: string[] }
): Promise<{ success: boolean; issueId: string }> {
  const response = await fetch(`/api/v1/customer-portal/${accessToken}/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to report issue');
  }

  return response.json();
}

export async function getPhotos(accessToken: string): Promise<Array<{
  id: string;
  url: string;
  type: 'BEFORE' | 'AFTER' | 'ISSUE' | 'OTHER';
  caption?: string;
  uploadedAt: string;
}>> {
  const response = await fetch(`/api/v1/customer-portal/${accessToken}/photos`);

  if (!response.ok) {
    throw new Error('Failed to load photos');
  }

  const data = await response.json();
  return data.photos;
}
