import { Injectable, Logger } from '@nestjs/common';
import {
    OrderIntakeRequestDto,
    SalesSystem,
    OrderType,
    Priority,
    ContactMethod,
    ConfidenceLevel,
} from '../sales-integration/dto';
import { SimulatorScenario, SimulatorTriggerRequestDto } from './dto/simulator-trigger-request.dto';
import {
    OrderIntakeService,
    EventMappingService,
    OrderMappingService,
} from '../sales-integration/services';
import { IntegrationContext } from '../sales-integration/interfaces';
import { faker } from '@faker-js/faker';

@Injectable()
export class SimulatorService {
    private readonly logger = new Logger(SimulatorService.name);

    constructor(
        private readonly orderIntakeService: OrderIntakeService,
        private readonly eventMappingService: EventMappingService,
        private readonly orderMappingService: OrderMappingService,
    ) { }

    async trigger(request: SimulatorTriggerRequestDto): Promise<{
        generatedCount: number;
        scenario: SimulatorScenario;
        orderIds: string[];
        errors: string[];
    }> {
        const count = request.count || 1;
        const orderIds: string[] = [];
        const errors: string[] = [];

        this.logger.log(`Starting simulation: ${request.scenario} x${count}`);

        for (let i = 0; i < count; i++) {
            try {
                const payload = this.generatePayload(request.scenario, request.overrides);

                // Simulate context
                const context: IntegrationContext = {
                    correlationId: `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    tenantId: 'demo-tenant',
                    timestamp: new Date(),
                };

                // Call OrderIntakeService
                const response = await this.orderIntakeService.execute(payload, context);

                if (response.status === 'RECEIVED') {
                    // Trigger event mapping (simulating Controller logic)
                    await this.eventMappingService.mapOrderIntakeToServiceOrderCreated(
                        payload.externalOrderId,
                        payload.salesSystem,
                        payload,
                        response.orderId,
                        context.correlationId,
                    );

                    // Map to internal format
                    this.orderMappingService.mapToInternalFormat(payload, response.orderId);

                    orderIds.push(response.orderId);
                } else {
                    const errorMsg = response.errors ? JSON.stringify(response.errors) : 'Unknown Error';
                    errors.push(`Failed to intake order: ${errorMsg}`);
                }
            } catch (error) {
                this.logger.error(`Simulation error: ${error.message}`, error.stack);
                errors.push(error.message);
            }
        }

        return {
            generatedCount: orderIds.length,
            scenario: request.scenario,
            orderIds,
            errors,
        };
    }

    private generatePayload(
        scenario: SimulatorScenario,
        overrides: Record<string, any> = {},
    ): OrderIntakeRequestDto {
        let payload: OrderIntakeRequestDto;

        switch (scenario) {
            case SimulatorScenario.EMERGENCY_REPAIR:
                payload = this.createEmergencyRepairScenario();
                break;
            case SimulatorScenario.VIP_MAINTENANCE:
                payload = this.createVipMaintenanceScenario();
                break;
            case SimulatorScenario.PROJECT_ROLLOUT:
                payload = this.createProjectRolloutScenario();
                break;
            case SimulatorScenario.STANDARD_INSTALLATION:
            default:
                payload = this.createStandardInstallationScenario();
                break;
        }

        // Apply strict overrides if provided (basic deep merge could be added here if needed)
        // For now, we assume overrides match the structural shape or we manually patch specific fields
        if (overrides && overrides.customer) {
            Object.assign(payload.customer, overrides.customer);
        }

        return payload;
    }

    private createStandardInstallationScenario(): OrderIntakeRequestDto {
        const externalId = `SIM-STD-${Date.now()}-${faker.string.numeric(3)}`;

        return {
            externalOrderId: externalId,
            salesSystem: SalesSystem.PYXIS,
            orderType: OrderType.INSTALLATION,
            priority: Priority.MEDIUM,
            externalReferences: {
                salesOrderId: `SO-${faker.string.alphanumeric(6).toUpperCase()}`,
                customerId: `CUST-${faker.string.numeric(5)}`,
            },
            customer: {
                customerId: `CUST-${faker.string.numeric(5)}`,
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                email: faker.internet.email(),
                phone: faker.phone.number({ style: 'international' }),
                preferredContactMethod: ContactMethod.EMAIL,
            },
            serviceAddress: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state({ abbreviated: true }),
                postalCode: faker.location.zipCode(),
                country: 'US', // Fixed for demo simplicity
            },
            serviceItems: [
                {
                    itemId: `ITM-${faker.string.numeric(4)}`,
                    productId: 'PROD-INTERNET-FIBER-1G',
                    productName: 'Fiber Internet 1Gbps',
                    quantity: 1,
                    requiresInstallation: true,
                    unitPrice: { amount: '89.99', currency: 'USD' },
                },
                {
                    itemId: `ITM-${faker.string.numeric(4)}`,
                    productId: 'PROD-ROUTER-WIFI6',
                    productName: 'WiFi 6 Router',
                    quantity: 1,
                    requiresInstallation: true,
                    unitPrice: { amount: '199.99', currency: 'USD' },
                },
            ],
            totalAmount: {
                subtotal: '289.98',
                tax: '28.99',
                total: '318.97',
                currency: 'USD',
            },
            schedulingPreferences: {
                preferredDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
                timeWindow: { start: '09:00', end: '12:00' },
            },
            requiredSkills: ['FIBER_INSTALLATION', 'ROUTER_CONFIG'],
            estimatedDuration: 120,
        };
    }

    private createEmergencyRepairScenario(): OrderIntakeRequestDto {
        const externalId = `SIM-EMG-${Date.now()}-${faker.string.numeric(3)}`;

        return {
            externalOrderId: externalId,
            salesSystem: SalesSystem.TEMPO,
            orderType: OrderType.REPAIR,
            priority: Priority.URGENT,
            externalReferences: {
                salesOrderId: `TKT-${faker.string.alphanumeric(6).toUpperCase()}`,
                customerId: `CUST-${faker.string.numeric(5)}`,
            },
            customer: {
                customerId: `CUST-${faker.string.numeric(5)}`,
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                email: faker.internet.email(),
                phone: faker.phone.number(),
                preferredContactMethod: ContactMethod.SMS,
            },
            serviceAddress: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state({ abbreviated: true }),
                postalCode: faker.location.zipCode(),
                country: 'US',
            },
            serviceItems: [
                {
                    itemId: `ITM-${faker.string.numeric(4)}`,
                    productId: 'SVC-REPAIR-URGENT',
                    productName: 'Emergency Repair Service',
                    quantity: 1,
                    requiresInstallation: false,
                    unitPrice: { amount: '150.00', currency: 'USD' },
                },
            ],
            totalAmount: {
                subtotal: '150.00',
                tax: '15.00',
                total: '165.00',
                currency: 'USD',
            },
            requiredSkills: ['FIBER_REPAIR', 'OUTAGE_TROUBLESHOOTING'],
            estimatedDuration: 60,
            metadata: {
                outageDetail: 'Customer reported total loss of service',
                reportedAt: new Date().toISOString(),
            },
        };
    }

    private createVipMaintenanceScenario(): OrderIntakeRequestDto {
        const externalId = `SIM-VIP-${Date.now()}-${faker.string.numeric(3)}`;

        return {
            externalOrderId: externalId,
            salesSystem: SalesSystem.SAP,
            orderType: OrderType.MAINTENANCE,
            priority: Priority.HIGH,
            externalReferences: {
                salesOrderId: `MNT-${faker.string.alphanumeric(6).toUpperCase()}`,
                customerId: `VIP-${faker.string.numeric(4)}`,
            },
            customer: {
                customerId: `VIP-${faker.string.numeric(4)}`,
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                email: faker.internet.email(),
                phone: faker.phone.number(),
                preferredContactMethod: ContactMethod.PHONE,
            },
            serviceAddress: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state({ abbreviated: true }),
                postalCode: faker.location.zipCode(),
                country: 'US',
                accessNotes: 'Gated community. Call upon arrival.',
                parkingInstructions: 'Reserved spot #42',
            },
            serviceItems: [
                {
                    itemId: `ITM-${faker.string.numeric(4)}`,
                    productId: 'SVC-MAINTENANCE-PREMIUM',
                    productName: 'Premium System Maintenance',
                    quantity: 1,
                    requiresInstallation: false,
                    unitPrice: { amount: '350.00', currency: 'USD' },
                },
            ],
            totalAmount: {
                subtotal: '350.00',
                tax: '35.00',
                total: '385.00',
                currency: 'USD',
            },
            schedulingPreferences: {
                technicianPreference: 'Senior Technician',
                notes: 'VIP Client. Ensure shoe covers are worn.',
            },
            requiredSkills: ['PREMIUM_CARE', 'SYSTEM_AUDIT'],
            estimatedDuration: 180,
        };
    }

    private createProjectRolloutScenario(): OrderIntakeRequestDto {
        const externalId = `SIM-PRJ-${Date.now()}-${faker.string.numeric(3)}`;
        const projectId = `PRJ-${faker.string.alphanumeric(4).toUpperCase()}`;

        return {
            externalOrderId: externalId,
            salesSystem: SalesSystem.PYXIS,
            orderType: OrderType.INSTALLATION,
            priority: Priority.MEDIUM,
            externalReferences: {
                salesOrderId: `SO-${faker.string.alphanumeric(6).toUpperCase()}`,
                projectId: projectId,
                customerId: `CORP-${faker.string.numeric(4)}`,
            },
            customer: {
                customerId: `CORP-${faker.string.numeric(4)}`,
                firstName: 'Site Manager',
                lastName: faker.person.lastName(),
                email: `site.manager.${faker.string.numeric(3)}@corp-client.com`,
                phone: faker.phone.number(),
                preferredContactMethod: ContactMethod.EMAIL,
            },
            serviceAddress: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state({ abbreviated: true }),
                postalCode: faker.location.zipCode(),
                country: 'US',
            },
            serviceItems: [
                {
                    itemId: `ITM-${faker.string.numeric(4)}`,
                    productId: 'PROD-BUSINESS-GW',
                    productName: 'Business Gateway Pro',
                    quantity: 1,
                    requiresInstallation: true,
                    unitPrice: { amount: '450.00', currency: 'USD' },
                },
            ],
            totalAmount: {
                subtotal: '450.00',
                tax: '45.00',
                total: '495.00',
                currency: 'USD',
            },
            preEstimation: {
                estimationId: `EST-${faker.string.alphanumeric(5).toUpperCase()}`,
                estimatedValue: 5000,
                currency: 'USD',
                confidenceLevel: ConfidenceLevel.HIGH,
                productCategories: ['BUSINESS_INTERNET'],
            },
            metadata: {
                projectId: projectId,
                phase: 'Phase 1 Rollout',
            },
            requiredSkills: ['BUSINESS_INSTALLATION'],
            estimatedDuration: 240,
        };
    }
}
