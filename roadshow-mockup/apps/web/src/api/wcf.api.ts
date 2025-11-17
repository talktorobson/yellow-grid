/**
 * WCF & Contracts API Service
 */
import { apiClient } from './client';
import type { WCF, Contract, WCFStatus, ContractStatus } from '../types';

export const wcfApi = {
  // WCF operations
  getAllWCFs: (params?: { status?: WCFStatus; countryCode?: string }) =>
    apiClient.get<WCF[]>('/api/v1/wcf', { params }),

  getWCFById: (id: string) =>
    apiClient.get<WCF>(`/api/v1/wcf/${id}`),

  generateWCF: (executionId: string) =>
    apiClient.post<WCF>('/api/v1/wcf/generate', { executionId }),

  customerSignWCF: (id: string, data: {
    signature: string;
    rating?: number;
    feedback?: string;
  }) => apiClient.post<WCF>(`/api/v1/wcf/${id}/customer-sign`, data),

  customerRefuseWCF: (id: string, reason: string) =>
    apiClient.post<WCF>(`/api/v1/wcf/${id}/customer-refuse`, { reason }),

  addReserve: (id: string, data: {
    category: string;
    description: string;
    severity: string;
  }) => apiClient.post(`/api/v1/wcf/${id}/reserves`, data),

  getWCFsWithReserves: (countryCode?: string) =>
    apiClient.get<WCF[]>('/api/v1/wcf/with-reserves', {
      params: { countryCode },
    }),

  // Contracts operations
  getAllContracts: (params?: { status?: ContractStatus; countryCode?: string }) =>
    apiClient.get<Contract[]>('/api/v1/contracts', { params }),

  getContractById: (id: string) =>
    apiClient.get<Contract>(`/api/v1/contracts/${id}`),

  generateContract: (serviceOrderId: string, assignmentId: string) =>
    apiClient.post<Contract>('/api/v1/contracts/generate', {
      serviceOrderId,
      assignmentId,
    }),

  sendContract: (id: string) =>
    apiClient.post<Contract>(`/api/v1/contracts/${id}/send`),

  customerSignContract: (id: string, signature: string) =>
    apiClient.post<Contract>(`/api/v1/contracts/${id}/customer-sign`, { signature }),

  customerRefuseContract: (id: string, reason: string) =>
    apiClient.post<Contract>(`/api/v1/contracts/${id}/customer-refuse`, { reason }),

  getPendingContracts: (countryCode?: string) =>
    apiClient.get<Contract[]>('/api/v1/contracts/pending', {
      params: { countryCode },
    }),
};
