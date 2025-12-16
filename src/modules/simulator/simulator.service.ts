import { Injectable, Logger } from '@nestjs/common';
import {
    OrderIntakeRequestDto,
    UpdateDeliveryDateDto,
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

                let response;

                // Dispatch based on payload type or scenario
                if (request.scenario === SimulatorScenario.UPDATE_DELIVERY_DATE) {
                    response = await this.orderIntakeService.executeUpdate(payload as any as UpdateDeliveryDateDto, context);
                } else {
                    response = await this.orderIntakeService.execute(payload as OrderIntakeRequestDto, context);
                }

                if (response.status === 'RECEIVED') {
                    // Trigger event mapping (simulating Controller logic)
                    // Only for standard Order Intake currently
                    if (request.scenario !== SimulatorScenario.UPDATE_DELIVERY_DATE) {
                        const intakePayload = payload as OrderIntakeRequestDto;
                        await this.eventMappingService.mapOrderIntakeToServiceOrderCreated(
                            intakePayload.order.id,
                            intakePayload.system,
                            intakePayload,
                            response.orderId,
                            context.correlationId,
                        );

                        // Map to internal format
                        this.orderMappingService.mapToInternalFormat(intakePayload, response.orderId);
                    }

                    orderIds.push(response.orderId || (payload as any).customerOrderNumber);
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
    ): OrderIntakeRequestDto | UpdateDeliveryDateDto {
        let payload: OrderIntakeRequestDto | UpdateDeliveryDateDto;

        switch (scenario) {
            case SimulatorScenario.UPDATE_DELIVERY_DATE:
                payload = this.createUpdateDeliveryDateScenario();
                break;
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
        if (overrides && (payload as any).customer) {
            Object.assign((payload as any).customer, overrides.customer);
        } else if (overrides) {
            Object.assign(payload, overrides);
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

    private createUpdateDeliveryDateScenario(): UpdateDeliveryDateDto {
        return {
            eventType: 'UpdateDeliveryDate',
            businessUnitIdentifier: '005',
            storeIdentifier: '007',
            customerOrderNumber: `25${faker.string.numeric(5)}L${faker.string.numeric(3)}`,
            maxDeliveryDate: faker.date.future({ years: 1 }).toISOString(),
            deliveryStatus: null,
            saleSystem: 'Tempo',
            itemDeliveryDates: [
                {
                    lineItemId: faker.string.uuid(),
                    itemMaxDeliveryDate: faker.date.future({ years: 1 }).toISOString()
                }
            ]
        };
    }
}
