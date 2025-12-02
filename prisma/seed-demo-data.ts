/**
 * Demo Data Seed Script
 * Generates realistic operation data for PT, ES, IT, FR
 * Run with: npx ts-node prisma/seed-demo-data.ts
 */

import { PrismaClient, ServiceCategory, ServiceType, ServiceStatus, ProviderStatus, BookingType, AssignmentState, AssignmentMode, ServiceUrgency, ServiceOrderState, SalesChannel, PaymentStatus, DeliveryStatus, LineItemType, LineExecutionStatus, ProviderTypeEnum, RiskLevel, ZoneType, WorkTeamStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number, daysAhead: number): Date {
  const now = new Date();
  const offset = randomInt(-daysAgo, daysAhead);
  now.setDate(now.getDate() + offset);
  return now;
}

function generateRef(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(5, '0')}`;
}

// ============================================================================
// COUNTRY-SPECIFIC DATA
// ============================================================================

const countryData = {
  PT: {
    code: 'PT',
    currency: 'EUR',
    timezone: 'Europe/Lisbon',
    locale: 'pt-PT',
    cities: [
      { name: 'Lisboa', postalCodes: ['1000-001', '1100-001', '1200-001', '1300-001', '1400-001'] },
      { name: 'Porto', postalCodes: ['4000-001', '4100-001', '4200-001', '4300-001'] },
      { name: 'Faro', postalCodes: ['8000-001', '8100-001'] },
    ],
    customerNames: [
      { firstName: 'João', lastName: 'Silva' },
      { firstName: 'Maria', lastName: 'Santos' },
      { firstName: 'António', lastName: 'Ferreira' },
      { firstName: 'Ana', lastName: 'Costa' },
      { firstName: 'Pedro', lastName: 'Oliveira' },
      { firstName: 'Carla', lastName: 'Rodrigues' },
      { firstName: 'Miguel', lastName: 'Pereira' },
      { firstName: 'Sofia', lastName: 'Martins' },
    ],
    providerNames: [
      { name: 'TecniServ Lisboa', legalName: 'TecniServ Lisboa Lda' },
      { name: 'ProInstalar Porto', legalName: 'ProInstalar Porto SA' },
      { name: 'Climatização Sul', legalName: 'Climatização Sul Lda' },
    ],
    streets: ['Rua Augusta', 'Av. da Liberdade', 'Rua do Ouro', 'Av. Almirante Reis', 'Rua Santa Catarina'],
  },
  ES: {
    code: 'ES',
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    locale: 'es-ES',
    cities: [
      { name: 'Madrid', postalCodes: ['28001', '28002', '28003', '28004', '28005', '28006'] },
      { name: 'Barcelona', postalCodes: ['08001', '08002', '08003', '08004', '08005'] },
      { name: 'Valencia', postalCodes: ['46001', '46002', '46003', '46004'] },
      { name: 'Sevilla', postalCodes: ['41001', '41002', '41003'] },
    ],
    customerNames: [
      { firstName: 'Carlos', lastName: 'García' },
      { firstName: 'María', lastName: 'López' },
      { firstName: 'José', lastName: 'Martínez' },
      { firstName: 'Ana', lastName: 'Rodríguez' },
      { firstName: 'Francisco', lastName: 'Fernández' },
      { firstName: 'Laura', lastName: 'González' },
      { firstName: 'David', lastName: 'Sánchez' },
      { firstName: 'Carmen', lastName: 'Pérez' },
      { firstName: 'Alejandro', lastName: 'Ruiz' },
      { firstName: 'Isabel', lastName: 'Hernández' },
    ],
    providerNames: [
      { name: 'Servicios Integrales Madrid', legalName: 'Servicios Integrales Madrid SL' },
      { name: 'InstalaRapid Barcelona', legalName: 'InstalaRapid Barcelona SA' },
      { name: 'TecniHogar Valencia', legalName: 'TecniHogar Valencia SL' },
      { name: 'ClimaSur Sevilla', legalName: 'ClimaSur Sevilla SL' },
    ],
    streets: ['Calle Gran Vía', 'Paseo de la Castellana', 'Calle Serrano', 'Av. Diagonal', 'Calle Aragón'],
  },
  IT: {
    code: 'IT',
    currency: 'EUR',
    timezone: 'Europe/Rome',
    locale: 'it-IT',
    cities: [
      { name: 'Milano', postalCodes: ['20121', '20122', '20123', '20124', '20125'] },
      { name: 'Roma', postalCodes: ['00118', '00119', '00120', '00121', '00122'] },
      { name: 'Napoli', postalCodes: ['80100', '80121', '80122'] },
      { name: 'Torino', postalCodes: ['10121', '10122', '10123'] },
    ],
    customerNames: [
      { firstName: 'Marco', lastName: 'Rossi' },
      { firstName: 'Giulia', lastName: 'Bianchi' },
      { firstName: 'Alessandro', lastName: 'Ferrari' },
      { firstName: 'Francesca', lastName: 'Russo' },
      { firstName: 'Luca', lastName: 'Romano' },
      { firstName: 'Sara', lastName: 'Colombo' },
      { firstName: 'Matteo', lastName: 'Ricci' },
      { firstName: 'Chiara', lastName: 'Marino' },
    ],
    providerNames: [
      { name: 'TecnoInstall Milano', legalName: 'TecnoInstall Milano SRL' },
      { name: 'ServiziCasa Roma', legalName: 'ServiziCasa Roma SPA' },
      { name: 'ProImpianti Napoli', legalName: 'ProImpianti Napoli SRL' },
    ],
    streets: ['Via Roma', 'Corso Vittorio Emanuele', 'Via Milano', 'Via Torino', 'Via Nazionale'],
  },
  FR: {
    code: 'FR',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    locale: 'fr-FR',
    cities: [
      { name: 'Paris', postalCodes: ['75001', '75002', '75003', '75004', '75005', '75006', '75007', '75008'] },
      { name: 'Lyon', postalCodes: ['69001', '69002', '69003', '69004'] },
      { name: 'Marseille', postalCodes: ['13001', '13002', '13003', '13004'] },
      { name: 'Bordeaux', postalCodes: ['33000', '33100', '33200'] },
    ],
    customerNames: [
      { firstName: 'Pierre', lastName: 'Martin' },
      { firstName: 'Marie', lastName: 'Bernard' },
      { firstName: 'Jean', lastName: 'Dubois' },
      { firstName: 'Sophie', lastName: 'Thomas' },
      { firstName: 'Philippe', lastName: 'Robert' },
      { firstName: 'Isabelle', lastName: 'Richard' },
      { firstName: 'Nicolas', lastName: 'Petit' },
      { firstName: 'Nathalie', lastName: 'Durand' },
      { firstName: 'François', lastName: 'Leroy' },
      { firstName: 'Catherine', lastName: 'Moreau' },
    ],
    providerNames: [
      { name: 'Services Pro Paris', legalName: 'Services Pro Paris SARL' },
      { name: 'InstallPlus Lyon', legalName: 'InstallPlus Lyon SAS' },
      { name: 'TechniService Marseille', legalName: 'TechniService Marseille SARL' },
      { name: 'ProHabitat Bordeaux', legalName: 'ProHabitat Bordeaux SAS' },
    ],
    streets: ['Rue de Rivoli', 'Avenue des Champs-Élysées', 'Boulevard Saint-Germain', 'Rue du Faubourg', 'Avenue Montaigne'],
  },
};

// ============================================================================
// SERVICE TYPES
// ============================================================================

const serviceTypes = [
  { code: 'HVAC_INSTALL', name: 'Air Conditioning Installation', category: ServiceCategory.HVAC, duration: 180 },
  { code: 'HVAC_REPAIR', name: 'HVAC Repair', category: ServiceCategory.HVAC, duration: 120 },
  { code: 'PLUMB_INSTALL', name: 'Plumbing Installation', category: ServiceCategory.PLUMBING, duration: 150 },
  { code: 'PLUMB_REPAIR', name: 'Plumbing Repair', category: ServiceCategory.PLUMBING, duration: 90 },
  { code: 'WATER_HEATER', name: 'Water Heater Installation', category: ServiceCategory.PLUMBING, duration: 180 },
  { code: 'ELEC_INSTALL', name: 'Electrical Installation', category: ServiceCategory.ELECTRICAL, duration: 120 },
  { code: 'KITCHEN_FULL', name: 'Full Kitchen Installation', category: ServiceCategory.KITCHEN, duration: 480 },
  { code: 'BATHROOM_FULL', name: 'Full Bathroom Installation', category: ServiceCategory.BATHROOM, duration: 360 },
  { code: 'FLOOR_TILE', name: 'Tile Flooring Installation', category: ServiceCategory.FLOORING, duration: 240 },
  { code: 'WINDOW_INSTALL', name: 'Window Installation', category: ServiceCategory.WINDOWS_DOORS, duration: 120 },
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedDemoData() {
  console.log('🌱 Starting demo data seed...\n');

  const countries = ['PT', 'ES', 'IT', 'FR'] as const;
  let serviceOrderCounter = 1;
  let providerCounter = 1;
  let workTeamCounter = 1;

  // Get existing services or create them
  let services = await prisma.serviceCatalog.findMany({ take: 10 });
  
  if (services.length === 0) {
    console.log('⚠️  No services found. Creating sample services...');
    for (const svc of serviceTypes) {
      const service = await prisma.serviceCatalog.create({
        data: {
          externalServiceCode: `DEMO_${svc.code}`,
          fsmServiceCode: `FSM_${svc.code}`,
          externalSource: 'DEMO',
          countryCode: 'ES',
          businessUnit: 'LEROY_MERLIN',
          serviceType: ServiceType.INSTALLATION,
          serviceCategory: svc.category,
          name: svc.name,
          description: `Demo service: ${svc.name}`,
          scopeIncluded: ['Installation', 'Testing', 'Cleanup'],
          scopeExcluded: ['Wall modifications', 'Permits'],
          worksiteRequirements: ['Clear access to work area'],
          productPrerequisites: ['Equipment delivered'],
          syncChecksum: `DEMO_${svc.code}_${Date.now()}`,
          estimatedDurationMinutes: svc.duration,
          requiresPreServiceContract: true,
          requiresPostServiceWCF: true,
          status: ServiceStatus.ACTIVE,
          createdBy: 'DEMO_SEED',
        },
      });
      services.push(service);
    }
    console.log(`✅ Created ${services.length} demo services\n`);
  }

  // Get or create stores
  let stores = await prisma.store.findMany();
  const storesByCountry: Record<string, typeof stores[0][]> = {};
  
  for (const country of countries) {
    storesByCountry[country] = stores.filter(s => s.countryCode === country);
    
    // Create store if none exist for this country
    if (storesByCountry[country].length === 0) {
      const cityData = countryData[country].cities[0];
      const store = await prisma.store.create({
        data: {
          externalStoreId: `LM_${country}_DEMO`,
          name: `Leroy Merlin ${cityData.name}`,
          countryCode: country,
          businessUnit: 'LEROY_MERLIN',
          buCode: `LM_${country}_001`,
          address: {
            street: randomElement(countryData[country].streets) + ' 1',
            city: cityData.name,
            postalCode: cityData.postalCodes[0],
            country: country,
          },
          timezone: countryData[country].timezone,
          isActive: true,
        },
      });
      storesByCountry[country] = [store];
    }
  }

  // ============================================================================
  // CREATE PROVIDERS AND WORK TEAMS FOR EACH COUNTRY
  // ============================================================================
  
  const createdProviders: Record<string, any[]> = {};
  const createdWorkTeams: Record<string, any[]> = {};

  for (const country of countries) {
    console.log(`\n🏢 Creating providers for ${country}...`);
    createdProviders[country] = [];
    createdWorkTeams[country] = [];

    const providerData = countryData[country].providerNames;
    const cityData = countryData[country].cities;

    for (let i = 0; i < providerData.length; i++) {
      const provData = providerData[i];
      const city = cityData[i % cityData.length];
      
      // Check if provider already exists
      let provider = await prisma.provider.findFirst({
        where: { externalId: `PROV_${country}_${String(providerCounter).padStart(3, '0')}` }
      });

      if (!provider) {
        provider = await prisma.provider.create({
          data: {
            externalId: `PROV_${country}_${String(providerCounter).padStart(3, '0')}`,
            countryCode: country,
            businessUnit: 'LEROY_MERLIN',
            name: provData.name,
            legalName: provData.legalName,
            taxId: `${country}${String(Math.random()).slice(2, 11)}`,
            email: `contact@${provData.name.toLowerCase().replace(/\s/g, '')}.com`,
            phone: `+${country === 'PT' ? '351' : country === 'ES' ? '34' : country === 'IT' ? '39' : '33'} ${randomInt(100000000, 999999999)}`,
            address: {
              street: randomElement(countryData[country].streets) + ` ${randomInt(1, 200)}`,
              city: city.name,
              postalCode: randomElement(city.postalCodes),
              country: country,
            },
            providerType: i === 0 ? ProviderTypeEnum.P1 : ProviderTypeEnum.P2,
            status: ProviderStatus.ACTIVE,
            riskLevel: RiskLevel.LOW,
            coordinates: { lat: 40 + Math.random() * 5, lng: -4 + Math.random() * 8 },
            contractStartDate: new Date('2024-01-01'),
          },
        });

        // Create working schedule
        await prisma.providerWorkingSchedule.create({
          data: {
            providerId: provider.id,
            workingDays: [1, 2, 3, 4, 5],
            morningShiftEnabled: true,
            morningShiftStart: '08:00',
            morningShiftEnd: '13:00',
            afternoonShiftEnabled: true,
            afternoonShiftStart: '14:00',
            afternoonShiftEnd: '19:00',
            eveningShiftEnabled: false,
            lunchBreakEnabled: true,
            lunchBreakStart: '13:00',
            lunchBreakEnd: '14:00',
            maxDailyJobsTotal: 8,
            maxWeeklyJobsTotal: 35,
            updatedBy: 'DEMO_SEED',
          },
        });

        // Create intervention zones
        await prisma.interventionZone.create({
          data: {
            providerId: provider.id,
            name: `${city.name} Centro`,
            zoneCode: `${city.name.toUpperCase().slice(0, 3)}-CENTRO`,
            zoneType: ZoneType.PRIMARY,
            postalCodes: city.postalCodes,
            maxCommuteMinutes: 45,
            defaultTravelBuffer: 30,
            maxDailyJobsInZone: 6,
            assignmentPriority: 1,
          },
        });
      }

      createdProviders[country].push(provider);
      providerCounter++;

      // Create 2 work teams per provider
      for (let t = 0; t < 2; t++) {
        const teamName = t === 0 ? 'Equipo A' : 'Equipo B';
        
        let workTeam = await prisma.workTeam.findFirst({
          where: { 
            providerId: provider.id,
            name: { contains: teamName }
          }
        });

        if (!workTeam) {
          workTeam = await prisma.workTeam.create({
            data: {
              providerId: provider.id,
              countryCode: country,
              externalId: `TEAM_${country}_${String(workTeamCounter).padStart(3, '0')}`,
              name: `${provData.name} - ${teamName}`,
              status: WorkTeamStatus.ACTIVE,
              maxDailyJobs: 4,
              minTechnicians: 1,
              maxTechnicians: 3,
              skills: ['HVAC', 'PLUMBING', 'ELECTRICAL'],
              serviceTypes: ['INSTALLATION', 'REPAIR'],
              postalCodes: city.postalCodes,
              workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
              shifts: [
                { code: 'AM', startLocal: '08:00', endLocal: '13:00' },
                { code: 'PM', startLocal: '14:00', endLocal: '19:00' },
              ],
            },
          });
          workTeamCounter++;
        }
        
        createdWorkTeams[country].push(workTeam);
      }
    }

    console.log(`✅ Created ${createdProviders[country].length} providers and ${createdWorkTeams[country].length} work teams for ${country}`);
  }

  // ============================================================================
  // CREATE SERVICE ORDERS WITH VARIOUS STATES
  // ============================================================================
  
  console.log('\n📋 Creating service orders...');

  const serviceOrderStates: { state: ServiceOrderState; weight: number }[] = [
    { state: ServiceOrderState.CREATED, weight: 15 },
    { state: ServiceOrderState.SCHEDULED, weight: 20 },
    { state: ServiceOrderState.ASSIGNED, weight: 15 },
    { state: ServiceOrderState.ACCEPTED, weight: 10 },
    { state: ServiceOrderState.IN_PROGRESS, weight: 15 },
    { state: ServiceOrderState.COMPLETED, weight: 20 },
    { state: ServiceOrderState.CANCELLED, weight: 5 },
  ];

  function weightedRandomState(): ServiceOrderState {
    const total = serviceOrderStates.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * total;
    for (const s of serviceOrderStates) {
      random -= s.weight;
      if (random <= 0) return s.state;
    }
    return ServiceOrderState.CREATED;
  }

  const urgencyLevels = [ServiceUrgency.URGENT, ServiceUrgency.STANDARD, ServiceUrgency.LOW];
  const salesChannels = [SalesChannel.IN_STORE, SalesChannel.ONLINE, SalesChannel.PHONE];
  
  const createdServiceOrders: any[] = [];

  for (const country of countries) {
    const numOrders = country === 'ES' ? 15 : country === 'FR' ? 12 : 8; // More orders for ES/FR
    
    console.log(`\n  Creating ${numOrders} service orders for ${country}...`);

    for (let i = 0; i < numOrders; i++) {
      const cityInfo = randomElement(countryData[country].cities);
      const customer = randomElement(countryData[country].customerNames);
      const service = randomElement(services);
      const state = weightedRandomState();
      const provider = randomElement(createdProviders[country]);
      const workTeam = randomElement(createdWorkTeams[country].filter(wt => wt.providerId === provider.id));
      const store = randomElement(storesByCountry[country]);
      
      // Determine dates based on state
      const completedStates: ServiceOrderState[] = [ServiceOrderState.COMPLETED, ServiceOrderState.CANCELLED];
      const scheduledStates: ServiceOrderState[] = [ServiceOrderState.SCHEDULED, ServiceOrderState.ASSIGNED, ServiceOrderState.ACCEPTED, ServiceOrderState.IN_PROGRESS, ServiceOrderState.COMPLETED];
      const activeStates: ServiceOrderState[] = [ServiceOrderState.IN_PROGRESS];
      const acceptedStates: ServiceOrderState[] = [ServiceOrderState.ACCEPTED, ServiceOrderState.IN_PROGRESS, ServiceOrderState.COMPLETED];
      
      const isCompleted = completedStates.includes(state);
      const isScheduled = scheduledStates.includes(state);
      const isActive = activeStates.includes(state);
      const isAccepted = acceptedStates.includes(state);
      
      const requestedStart = isCompleted ? randomDate(14, 0) : randomDate(0, 14);
      const requestedEnd = new Date(requestedStart);
      requestedEnd.setDate(requestedEnd.getDate() + 7);
      
      const scheduledDate = isScheduled ? new Date(requestedStart) : null;
      if (scheduledDate) {
        scheduledDate.setDate(scheduledDate.getDate() + randomInt(1, 5));
      }

      const orderRef = generateRef(`SO-${country}`, serviceOrderCounter);
      
      const serviceOrder = await prisma.serviceOrder.create({
        data: {
          externalServiceOrderId: `EXT_${orderRef}`,
          serviceId: service.id,
          countryCode: country,
          businessUnit: 'LEROY_MERLIN',
          storeId: store?.id,
          buCode: store?.buCode || `LM_${country}_001`,
          salesChannel: randomElement(salesChannels),
          salesOrderNumber: `LM-2025-${String(serviceOrderCounter).padStart(6, '0')}`,
          orderDate: randomDate(30, 0),
          
          customerInfo: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            fullName: `${customer.firstName} ${customer.lastName}`,
            email: `${customer.firstName.toLowerCase()}.${customer.lastName.toLowerCase()}@email.com`,
            phone: `+${country === 'PT' ? '351' : country === 'ES' ? '34' : country === 'IT' ? '39' : '33'} ${randomInt(600000000, 699999999)}`,
            mobile: `+${country === 'PT' ? '351' : country === 'ES' ? '34' : country === 'IT' ? '39' : '33'} ${randomInt(900000000, 999999999)}`,
          },
          
          serviceType: ServiceType.INSTALLATION,
          urgency: randomElement(urgencyLevels),
          estimatedDurationMinutes: service.estimatedDurationMinutes || 180,
          
          serviceAddress: {
            street: `${randomElement(countryData[country].streets)} ${randomInt(1, 200)}`,
            city: cityInfo.name,
            postalCode: randomElement(cityInfo.postalCodes),
            country: country,
            lat: 40 + Math.random() * 5,
            lng: -4 + Math.random() * 8,
          },
          
          requestedStartDate: requestedStart,
          requestedEndDate: requestedEnd,
          requestedTimeSlot: randomElement(['AM', 'PM', null]),
          
          scheduledDate: scheduledDate,
          scheduledStartTime: scheduledDate ? new Date(scheduledDate.setHours(randomInt(8, 15), 0, 0, 0)) : null,
          scheduledEndTime: scheduledDate ? new Date(scheduledDate.setHours(randomInt(16, 19), 0, 0, 0)) : null,
          
          // Assign provider for scheduled+ states
          assignedProviderId: isScheduled ? provider.id : null,
          assignedWorkTeamId: isScheduled && workTeam ? workTeam.id : null,
          
          currency: 'EUR',
          totalAmountCustomer: randomInt(150, 1500),
          totalAmountProvider: randomInt(100, 1200),
          paymentStatus: isCompleted ? PaymentStatus.PAID : PaymentStatus.PENDING,
          
          productDeliveryStatus: isScheduled ? DeliveryStatus.DELIVERED : DeliveryStatus.PENDING,
          allProductsDelivered: isScheduled,
          
          riskLevel: randomElement([RiskLevel.NONE, RiskLevel.LOW, RiskLevel.MEDIUM]),
          
          state: state,
          stateChangedAt: new Date(),
          
          createdBy: 'DEMO_SEED',
        },
      });

      createdServiceOrders.push(serviceOrder);

      // Create line items
      const serviceUnitPrice = randomInt(100, 800);
      const serviceTaxRate = 0.21;
      const serviceTotalExclTax = serviceUnitPrice * 1;
      const serviceTaxAmount = serviceTotalExclTax * serviceTaxRate;
      const serviceTotal = serviceTotalExclTax + serviceTaxAmount;
      
      await prisma.serviceOrderLineItem.create({
        data: {
          serviceOrderId: serviceOrder.id,
          lineNumber: 1,
          lineType: LineItemType.SERVICE,
          sku: service.fsmServiceCode || 'SVC-001',
          name: service.name,
          quantity: 1,
          unitOfMeasure: 'UNIT',
          unitPriceCustomer: serviceUnitPrice,
          taxRateCustomer: serviceTaxRate,
          lineTotalCustomerExclTax: serviceTotalExclTax,
          lineTaxAmountCustomer: serviceTaxAmount,
          lineTotalCustomer: serviceTotal,
          unitPriceProvider: randomInt(80, 600),
          executionStatus: isCompleted ? LineExecutionStatus.COMPLETED : isActive ? LineExecutionStatus.IN_PROGRESS : LineExecutionStatus.PENDING,
        },
      });

      // Add a product line item for some orders
      if (Math.random() > 0.5) {
        const productUnitPrice = randomInt(200, 1500);
        const productTaxRate = 0.21;
        const productTotalExclTax = productUnitPrice * 1;
        const productTaxAmount = productTotalExclTax * productTaxRate;
        const productTotal = productTotalExclTax + productTaxAmount;
        
        await prisma.serviceOrderLineItem.create({
          data: {
            serviceOrderId: serviceOrder.id,
            lineNumber: 2,
            lineType: LineItemType.PRODUCT,
            sku: `PROD-${randomInt(1000, 9999)}`,
            name: randomElement(['Air Conditioner Unit', 'Water Heater 100L', 'Kitchen Sink', 'Bathroom Vanity', 'Window Frame']),
            quantity: 1,
            unitOfMeasure: 'UNIT',
            unitPriceCustomer: productUnitPrice,
            taxRateCustomer: productTaxRate,
            lineTotalCustomerExclTax: productTotalExclTax,
            lineTaxAmountCustomer: productTaxAmount,
            lineTotalCustomer: productTotal,
            deliveryStatus: isScheduled ? DeliveryStatus.DELIVERED : DeliveryStatus.PENDING,
          },
        });
      }

      // Create assignment for assigned+ states
      if (isScheduled) {
        // Determine assignment state based on service order state
        let assignmentState: AssignmentState;
        if (state === ServiceOrderState.ASSIGNED) {
          assignmentState = AssignmentState.PENDING;
        } else if (isAccepted) {
          assignmentState = AssignmentState.ACCEPTED;
        } else if (state === ServiceOrderState.CANCELLED) {
          assignmentState = AssignmentState.CANCELLED;
        } else {
          assignmentState = AssignmentState.OFFERED;
        }
        
        await prisma.assignment.create({
          data: {
            serviceOrderId: serviceOrder.id,
            providerId: provider.id,
            workTeamId: workTeam?.id,
            assignmentMode: AssignmentMode.DIRECT,
            assignmentMethod: 'DIRECT',
            providerRank: 1,
            state: assignmentState,
            acceptedAt: isAccepted ? new Date() : null,
            createdBy: 'DEMO_SEED',
          },
        });
      }

      serviceOrderCounter++;
    }
  }

  console.log(`\n✅ Created ${createdServiceOrders.length} service orders total`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  console.log('\n📊 DEMO DATA SUMMARY:');
  console.log('=====================');
  
  for (const country of countries) {
    const providerCount = createdProviders[country].length;
    const workTeamCount = createdWorkTeams[country].length;
    const orderCount = createdServiceOrders.filter(so => so.countryCode === country).length;
    
    console.log(`\n${country}:`);
    console.log(`  - Providers: ${providerCount}`);
    console.log(`  - Work Teams: ${workTeamCount}`);
    console.log(`  - Service Orders: ${orderCount}`);
  }

  // Service order states summary
  console.log('\n📈 SERVICE ORDER STATES:');
  const stateCounts: Record<string, number> = {};
  for (const so of createdServiceOrders) {
    stateCounts[so.state] = (stateCounts[so.state] || 0) + 1;
  }
  for (const [state, count] of Object.entries(stateCounts)) {
    console.log(`  - ${state}: ${count}`);
  }

  console.log('\n🎉 Demo data seed completed successfully!');
}

// Run
seedDemoData()
  .catch((e) => {
    console.error('❌ Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
