import { Injectable, Logger } from '@nestjs/common';
import {
    OrderIntakeRequestDto,
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
                        payload.order.id,
                        payload.system,
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
        const orderId = `72${faker.string.numeric(4)}`;

        return {
            items: [
                {
                    id: faker.string.numeric(8),
                    type: "SE",
                    vatCode: "21",
                    vatRate: 21,
                    quantity: 1,
                    unitPrice: 29.99,
                    itemNumber: faker.string.numeric(5),
                    description: "INSTALACIÓN MUEBLE LAVAB HAST 100 COLG A",
                    expectedDate: faker.date.future().toISOString(),
                    paymentStatus: "Not Paid",
                    providersPrice: null,
                    configurationIdentifier: null
                }
            ],
            order: {
                id: orderId,
                vats: [{ rate: 21, amount: 5.2 }],
                shift: "M",
                channel: "STORE",
                storeId: "011",
                mavNumber: null,
                orderUUID: null,
                sellerNotes: "",
                creationDate: new Date().toISOString(),
                scheduledDate: faker.date.future().toISOString(),
                businessUnitId: "002",
                deliveryStatus: "DELIVERED",
                maxDeliveryDate: null,
                preEstimationId: null,
                salesAdapterNotes: null,
                orderPaymentStatus: "NOT_PAID",
                transactionLinkedTo: null,
                preEstimationVersion: null,
                saleSystemOrderStatus: "AVAILABLE",
                technicalVisitMandatory: null,
                servcProviderAgreedPrice: null
            },
            system: "Pyxis Order",
            address: {
                city: "Palma",
                country: "ES",
                province: "",
                postalCode: "07012",
                streetName: faker.location.streetAddress(),
                streetNumber: "130s",
                buildingComplement: ""
            },
            version: 1,
            customer: {
                email: faker.internet.email(),
                phone: faker.phone.number({ style: 'international' }),
                number: faker.string.numeric(9),
                fiscalId: faker.string.numeric(9),
                lastName: faker.person.lastName(),
                firstName: faker.person.firstName()
            },
            modifiedBy: {
                id: "0",
                type: "COLLABORATOR",
                lastName: "SYSTEME",
                firstName: "SYSTEME"
            },
            generatedBy: {
                id: "0",
                type: "COLLABORATOR",
                lastName: "SYSTEME",
                firstName: "SYSTEME"
            },
            configurationIds: []
        };
    }

    private createEmergencyRepairScenario(): OrderIntakeRequestDto {
        const base = this.createStandardInstallationScenario();
        base.system = "TEMPO"; // Using different system for scenario variety
        base.items[0].description = "URGENT REPAIR SERVICE";
        base.order.sellerNotes = "Emergency request from customer";
        return base;
    }

    private createVipMaintenanceScenario(): OrderIntakeRequestDto {
        const base = this.createStandardInstallationScenario();
        base.system = "SAP";
        base.items[0].description = "VIP MAINTENANCE CHECK";
        base.order.sellerNotes = "VIP Customer - Handle with care";
        return base;
    }

    private createProjectRolloutScenario(): OrderIntakeRequestDto {
        const base = this.createStandardInstallationScenario();
        base.order.sellerNotes = "Part of Project Rollout Alpha";
        return base;
    }
}
