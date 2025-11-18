/**
 * Provider Service Tests
 * Testing CRUD operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { providerService } from '../provider-service';

describe('ProviderService', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'mock-access-token');
  });

  describe('getAll', () => {
    it('should fetch all providers', async () => {
      const result = await providerService.getAll({});

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].name).toBe('TechPro Services');
    });

    it('should return paginated results', async () => {
      const result = await providerService.getAll({});

      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBeGreaterThan(0);
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('getById', () => {
    it('should fetch provider by ID', async () => {
      const provider = await providerService.getById('provider-1');

      expect(provider).toBeDefined();
      expect(provider.id).toBe('provider-1');
      expect(provider.name).toBe('TechPro Services');
    });

    it('should throw error for non-existent provider', async () => {
      await expect(providerService.getById('non-existent')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new provider', async () => {
      const newProvider = {
        name: 'New Provider',
        email: 'new@provider.com',
        phone: '+33111222333',
        countryCode: 'FR',
        serviceTypes: ['Installation'],
        coverageZones: ['Paris'],
      };

      const result = await providerService.create(newProvider);

      expect(result).toBeDefined();
      expect(result.name).toBe('New Provider');
      expect(result.status).toBe('ACTIVE');
    });
  });
});
