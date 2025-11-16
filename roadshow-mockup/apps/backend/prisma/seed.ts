/**
 * Comprehensive Seed Data for Yellow Grid Roadshow Mockup
 * Demonstrates all 10 workflow steps with realistic scenarios
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data (in development only)
  console.log('🗑️  Cleaning existing data...');
  await prisma.dateNegotiation.deleteMany();
  await prisma.assignmentTransparency.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.task.deleteMany();
  await prisma.wCFReserve.deleteMany();
  await prisma.wCF.deleteMany();
  await prisma.execution.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.installOrder.deleteMany();
  await prisma.tVOrder.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.projectContact.deleteMany();
  await prisma.project.deleteMany();
  await prisma.providerZone.deleteMany();
  await prisma.workTeam.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
  await prisma.businessUnit.deleteMany();
  await prisma.country.deleteMany();

  // ==================== STEP 1: COUNTRY CONFIGURATION ====================
  console.log('1️⃣ Creating countries with configuration...');

  const countries = await Promise.all([
    prisma.country.create({
      data: {
        code: 'ES',
        name: 'Spain',
        timezone: 'Europe/Madrid',
        providerAutoAccept: true, // Spain auto-accepts
        offerTimeoutHours: 4,
        projectAssignmentMode: 'AUTO', // Auto-assign operators in ES
      },
    }),
    prisma.country.create({
      data: {
        code: 'FR',
        name: 'France',
        timezone: 'Europe/Paris',
        providerAutoAccept: false, // France requires explicit accept
        offerTimeoutHours: 4,
        projectAssignmentMode: 'MANUAL', // Manual assignment in FR
      },
    }),
    prisma.country.create({
      data: {
        code: 'IT',
        name: 'Italy',
        timezone: 'Europe/Rome',
        providerAutoAccept: true, // Italy auto-accepts
        offerTimeoutHours: 4,
        projectAssignmentMode: 'AUTO', // Auto-assign in IT
      },
    }),
    prisma.country.create({
      data: {
        code: 'PL',
        name: 'Poland',
        timezone: 'Europe/Warsaw',
        providerAutoAccept: false, // Poland requires explicit accept
        offerTimeoutHours: 6, // Longer timeout in PL
        projectAssignmentMode: 'MANUAL',
      },
    }),
  ]);

  console.log(`✅ Created ${countries.length} countries`);

  // ==================== STEP 2: BUSINESS UNITS & STORES ====================
  console.log('2️⃣ Creating business units and stores...');

  const buES = await prisma.businessUnit.create({
    data: {
      code: 'LM_ES',
      name: 'Leroy Merlin España',
      countryCode: 'ES',
    },
  });

  const buFR = await prisma.businessUnit.create({
    data: {
      code: 'LM_FR',
      name: 'Leroy Merlin France',
      countryCode: 'FR',
    },
  });

  const stores = await Promise.all([
    prisma.store.create({
      data: {
        code: 'LM_MAD_001',
        name: 'Leroy Merlin Madrid Centro',
        buCode: buES.code,
        countryCode: 'ES',
        city: 'Madrid',
      },
    }),
    prisma.store.create({
      data: {
        code: 'LM_PAR_001',
        name: 'Leroy Merlin Paris Nord',
        buCode: buFR.code,
        countryCode: 'FR',
        city: 'Paris',
      },
    }),
  ]);

  console.log(`✅ Created ${stores.length} stores`);

  // ==================== STEP 3: OPERATORS (USERS) ====================
  console.log('3️⃣ Creating operators...');

  const operators = await Promise.all([
    prisma.user.create({
      data: {
        email: 'maria.garcia@leroymerlin.es',
        name: 'Maria García',
        role: 'OPERATOR',
        countryCode: 'ES',
        active: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'pierre.dubois@leroymerlin.fr',
        name: 'Pierre Dubois',
        role: 'OPERATOR',
        countryCode: 'FR',
        active: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sophie.martin@leroymerlin.fr',
        name: 'Sophie Martin',
        role: 'OPERATOR',
        countryCode: 'FR',
        active: true,
      },
    }),
  ]);

  console.log(`✅ Created ${operators.length} operators`);

  // ==================== STEP 4: PROVIDERS WITH TIER & RISK ====================
  console.log('4️⃣ Creating providers with tier/risk/certifications...');

  const providerES_Tier1 = await prisma.provider.create({
    data: {
      name: 'Instalaciones García SL',
      countryCode: 'ES',
      buCode: buES.code,
      legalName: 'Instalaciones García Sociedad Limitada',
      siret: 'ES12345678',
      email: 'contact@instalacionesgarcia.es',
      phone: '+34912345678',
      contactName: 'Carlos García',
      tier: 1, // Best tier
      active: true,
      riskStatus: 'OK',
      rating: 4.8,
      certifications: JSON.stringify([
        { code: 'ISO9001', name: 'ISO 9001 Quality Management', expiresAt: '2025-12-31' },
        { code: 'SOLAR_CERT', name: 'Solar Installation Certified', expiresAt: '2026-06-30' },
      ]),
    },
  });

  const providerFR_Tier2 = await prisma.provider.create({
    data: {
      name: 'Artisan Services Paris',
      countryCode: 'FR',
      buCode: buFR.code,
      legalName: 'Artisan Services Paris SARL',
      siret: 'FR98765432',
      email: 'contact@artisan-paris.fr',
      phone: '+33145678901',
      contactName: 'Jean Dupont',
      tier: 2, // Standard tier
      active: true,
      riskStatus: 'OK',
      rating: 4.2,
      certifications: JSON.stringify([
        { code: 'ELEC_CERT', name: 'Electrical Installation License', expiresAt: '2025-03-31' },
      ]),
    },
  });

  const providerFR_OnWatch = await prisma.provider.create({
    data: {
      name: 'Quick Install France',
      countryCode: 'FR',
      buCode: buFR.code,
      legalName: 'Quick Install France SAS',
      siret: 'FR11223344',
      email: 'contact@quickinstall.fr',
      phone: '+33156789012',
      contactName: 'Marc Leroy',
      tier: 3, // Lower tier
      active: true,
      riskStatus: 'ON_WATCH', // Under surveillance
      riskReason: '2 recent customer complaints about quality',
      rating: 3.5,
    },
  });

  console.log(`✅ Created 3 providers with different tiers and risk statuses`);

  // ==================== STEP 5: WORK TEAMS ====================
  console.log('5️⃣ Creating work teams...');

  const workTeams = await Promise.all([
    prisma.workTeam.create({
      data: {
        providerId: providerES_Tier1.id,
        name: 'Equipo Solar A',
        active: true,
        certifications: JSON.stringify(['SOLAR_CERT', 'ISO9001']),
      },
    }),
    prisma.workTeam.create({
      data: {
        providerId: providerFR_Tier2.id,
        name: 'Équipe Nord',
        active: true,
        certifications: JSON.stringify(['ELEC_CERT']),
      },
    }),
    prisma.workTeam.create({
      data: {
        providerId: providerFR_OnWatch.id,
        name: 'Équipe Rapide 1',
        active: true,
      },
    }),
  ]);

  console.log(`✅ Created ${workTeams.length} work teams`);

  // ==================== STEP 6: PROVIDER ZONES ====================
  console.log('6️⃣ Creating provider zones...');

  await Promise.all([
    prisma.providerZone.create({
      data: {
        providerId: providerES_Tier1.id,
        name: 'Madrid y alrededores',
        postalCodes: JSON.stringify(['28001', '28002', '28003', '28004', '28005']),
      },
    }),
    prisma.providerZone.create({
      data: {
        providerId: providerFR_Tier2.id,
        name: 'Paris Nord',
        postalCodes: JSON.stringify(['75018', '75019', '93200', '93300']),
      },
    }),
  ]);

  console.log(`✅ Created provider zones`);

  // ==================== STEP 7: PROJECTS WITH AUTO-ASSIGNMENT ====================
  console.log('7️⃣ Creating projects with auto/manual assignment...');

  const projectES_Auto = await prisma.project.create({
    data: {
      externalId: 'PROJ-ES-2024-001',
      countryCode: 'ES',
      buCode: buES.code,
      storeCode: stores[0].code,
      worksiteStreet: 'Calle Gran Vía 45',
      worksiteCity: 'Madrid',
      worksiteZip: '28013',
      projectType: 'SOLAR_INSTALLATION',
      customerName: 'Juan Pérez',
      customerEmail: 'juan.perez@example.com',
      customerPhone: '+34655123456',
      totalHoursEstimated: 16,
      status: 'ACTIVE',
      responsibleOperatorId: operators[0].id, // Auto-assigned in ES
      assignmentMode: 'AUTO',
    },
  });

  const projectFR_Manual = await prisma.project.create({
    data: {
      externalId: 'PROJ-FR-2024-001',
      countryCode: 'FR',
      buCode: buFR.code,
      storeCode: stores[1].code,
      worksiteStreet: '123 Avenue des Champs-Élysées',
      worksiteCity: 'Paris',
      worksiteZip: '75008',
      projectType: 'KITCHEN_INSTALLATION',
      customerName: 'Marie Dupont',
      customerEmail: 'marie.dupont@example.com',
      customerPhone: '+33612345678',
      totalHoursEstimated: 24,
      status: 'ACTIVE',
      responsibleOperatorId: operators[1].id, // Manually assigned in FR
      assignmentMode: 'MANUAL',
    },
  });

  // Add project contacts
  await Promise.all([
    prisma.projectContact.create({
      data: {
        projectId: projectES_Auto.id,
        name: 'Juan Pérez',
        role: 'Primary',
        email: 'juan.perez@example.com',
        phone: '+34655123456',
      },
    }),
    prisma.projectContact.create({
      data: {
        projectId: projectFR_Manual.id,
        name: 'Marie Dupont',
        role: 'Primary',
        email: 'marie.dupont@example.com',
        phone: '+33612345678',
      },
    }),
  ]);

  console.log(`✅ Created 2 projects (1 auto-assigned, 1 manual)`);

  // ==================== STEP 8: SERVICE ORDERS WITH SALES INTEGRATION ====================
  console.log('8️⃣ Creating service orders with sales integration...');

  // Technical Visit for ES project (will get sales potential assessment)
  const tvOrderES = await prisma.serviceOrder.create({
    data: {
      projectId: projectES_Auto.id,
      externalId: 'SO-TV-ES-001',
      serviceType: 'TECHNICAL_VISIT',
      priority: 'P1',
      countryCode: 'ES',
      buCode: buES.code,
      status: 'CREATED',
      scheduledDate: new Date('2024-12-01T10:00:00Z'),
      estimatedDuration: 2,
      // Sales integration fields
      salesOrderId: 'PYXIS-SO-12345',
      salesProjectId: 'PYXIS-PROJ-6789',
      salesLeadId: 'PYXIS-LEAD-9876',
      salesSystemSource: 'PYXIS',
      customerName: 'Juan Pérez',
      customerEmail: 'juan.perez@example.com',
      customerPhone: '+34655123456',
    },
  });

  // Create TVOrder detail
  await prisma.tVOrder.create({
    data: {
      serviceOrderId: tvOrderES.id,
      visitType: 'PRE_INSTALLATION',
      estimatedScope: JSON.stringify({
        panels: 12,
        inverters: 2,
        estimatedInstallHours: 16,
      }),
    },
  });

  // Installation order for FR project
  const installOrderFR = await prisma.serviceOrder.create({
    data: {
      projectId: projectFR_Manual.id,
      externalId: 'SO-INST-FR-001',
      serviceType: 'INSTALLATION',
      priority: 'P2',
      countryCode: 'FR',
      buCode: buFR.code,
      status: 'CREATED',
      scheduledDate: new Date('2024-12-05T09:00:00Z'),
      estimatedDuration: 8,
      salesOrderId: 'TEMPO-SO-54321',
      customerName: 'Marie Dupont',
      customerEmail: 'marie.dupont@example.com',
      customerPhone: '+33612345678',
    },
  });

  // Create InstallOrder detail
  await prisma.installOrder.create({
    data: {
      serviceOrderId: installOrderFR.id,
      productCategory: 'KITCHEN',
      productDetails: JSON.stringify({
        cabinets: 15,
        countertop: 'Quartz 3m',
        sink: '1x double basin',
        appliances: ['dishwasher', 'oven', 'cooktop'],
      }),
    },
  });

  console.log(`✅ Created 2 service orders (1 TV, 1 Installation) with sales integration`);

  // ==================== STEP 9: AI SALES POTENTIAL ASSESSMENT ====================
  console.log('9️⃣ Assessing sales potential (AI simulation)...');

  await prisma.serviceOrder.update({
    where: { id: tvOrderES.id },
    data: {
      salesPotential: 'HIGH', // AI determined high potential
      salesPotentialScore: 0.87,
      salesPotentialUpdatedAt: new Date(),
      salesPreEstimationValue: 15000, // €15k estimated
      salesmanNotes: 'Customer expressed strong interest in solar + battery storage expansion',
    },
  });

  console.log(`✅ Sales potential assessed: HIGH (87% score, €15k potential)`);

  // ==================== STEP 10: AI RISK ASSESSMENT ====================
  console.log('🔟 Assessing risk (AI simulation)...');

  await prisma.serviceOrder.update({
    where: { id: installOrderFR.id },
    data: {
      riskLevel: 'MEDIUM', // AI determined medium risk
      riskScore: 0.52,
      riskAssessedAt: new Date(),
      riskFactors: JSON.stringify({
        customerHistory: 'First-time customer',
        siteComplexity: 'Old building, potential structural issues',
        providerTier: 3, // Lower tier provider
        timeline: 'Tight deadline requested',
      }),
      riskAcknowledgedBy: operators[1].id,
      riskAcknowledgedAt: new Date(),
    },
  });

  console.log(`✅ Risk assessed: MEDIUM (52% score, acknowledged by operator)`);

  // Create high-risk alert
  await prisma.alert.create({
    data: {
      type: 'HIGH_RISK_SO',
      severity: 'WARNING',
      title: 'Medium Risk Service Order Detected',
      message: `Service Order ${installOrderFR.externalId} assessed as MEDIUM risk (52% score). Operator Pierre Dubois has acknowledged.`,
      metadata: JSON.stringify({
        serviceOrderId: installOrderFR.id,
        riskLevel: 'MEDIUM',
        riskScore: 0.52,
      }),
      acknowledged: true,
      acknowledgedAt: new Date(),
      countryCode: 'FR',
    },
  });

  // ==================== STEP 11: PROVIDER ASSIGNMENT WITH TRANSPARENCY ====================
  console.log('1️⃣1️⃣ Creating assignments with transparency funnel...');

  // ES assignment (auto-accept)
  const assignmentES = await prisma.assignment.create({
    data: {
      serviceOrderId: tvOrderES.id,
      providerId: providerES_Tier1.id,
      workTeamId: workTeams[0].id,
      status: 'ACCEPTED', // Auto-accepted in ES
      assignmentMode: 'DIRECT',
      proposedDate: new Date('2024-12-01T10:00:00Z'),
      originalDate: new Date('2024-12-01T10:00:00Z'),
      dateNegotiationRound: 0,
      offerExpiresAt: null, // No expiry for auto-accept
      acceptedAt: new Date(),
      acceptedDate: new Date('2024-12-01T10:00:00Z'),
    },
  });

  // Create assignment transparency record
  await prisma.assignmentTransparency.create({
    data: {
      assignmentId: assignmentES.id,
      funnel: JSON.stringify({
        totalCandidates: 5,
        afterZoneFilter: 3,
        afterCertFilter: 2,
        afterAvailabilityFilter: 2,
        afterRiskFilter: 2,
        finalCandidates: 2,
      }),
      scoringBreakdown: JSON.stringify([
        {
          providerId: providerES_Tier1.id,
          providerName: 'Instalaciones García SL',
          tier: 1,
          rating: 4.8,
          distance: 5.2,
          availability: 'FULL',
          riskStatus: 'OK',
          finalScore: 95.5,
          selected: true,
          reason: 'Best tier provider with excellent rating and full availability',
        },
      ]),
    },
  });

  // Update service order status
  await prisma.serviceOrder.update({
    where: { id: tvOrderES.id },
    data: { status: 'ASSIGNED' },
  });

  console.log(`✅ Created assignment with transparency (auto-accepted in ES)`);

  // FR assignment (requires explicit acceptance + date negotiation)
  const assignmentFR = await prisma.assignment.create({
    data: {
      serviceOrderId: installOrderFR.id,
      providerId: providerFR_Tier2.id,
      workTeamId: workTeams[1].id,
      status: 'PENDING', // Awaiting provider response
      assignmentMode: 'DIRECT',
      proposedDate: new Date('2024-12-05T09:00:00Z'),
      originalDate: new Date('2024-12-05T09:00:00Z'),
      dateNegotiationRound: 1, // In negotiation
      offerExpiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4h from now
    },
  });

  // Date negotiation (provider proposed alternative)
  await prisma.dateNegotiation.create({
    data: {
      assignmentId: assignmentFR.id,
      round: 1,
      proposedDate: new Date('2024-12-06T09:00:00Z'), // +1 day
      proposedBy: 'PROVIDER',
      notes: 'Équipe fully booked on Dec 5, proposing Dec 6 same time',
    },
  });

  console.log(`✅ Created assignment with date negotiation (round 1/3)`);

  // ==================== STEP 12: CONTRACT GENERATION & E-SIGNATURE ====================
  console.log('1️⃣2️⃣ Creating contracts with e-signatures...');

  // Contract for ES (signed)
  const contractES = await prisma.contract.create({
    data: {
      serviceOrderId: tvOrderES.id,
      assignmentId: assignmentES.id,
      status: 'SIGNED',
      generatedAt: new Date(),
      sentAt: new Date(),
      contractPdfUrl: 's3://contracts/tv-es-001.pdf',
      signatureType: 'DIGITAL',
      signatureMethod: 'DOCUSIGN',
      signedAt: new Date(),
      customerName: 'Juan Pérez',
      customerEmail: 'juan.perez@example.com',
    },
  });

  console.log(`✅ Created signed contract (DocuSign)`);

  // ==================== STEP 13: GO EXECUTION MONITORING ====================
  console.log('1️⃣3️⃣ Setting up Go Execution monitoring...');

  // ES order: All OK
  await prisma.serviceOrder.update({
    where: { id: tvOrderES.id },
    data: {
      goExecStatus: 'OK',
      paymentStatus: 'VERIFIED',
      productDeliveryStatus: 'NOT_APPLICABLE', // TV doesn't require products
      contractStatus: 'SIGNED',
    },
  });

  // FR order: Payment pending (NOK)
  await prisma.serviceOrder.update({
    where: { id: installOrderFR.id },
    data: {
      goExecStatus: 'NOK',
      goExecBlockReason: 'Customer payment not verified (€2,500 deposit pending)',
      paymentStatus: 'PENDING',
      productDeliveryStatus: 'SCHEDULED',
      contractStatus: 'PENDING',
    },
  });

  // Create task for payment issue
  await prisma.task.create({
    data: {
      type: 'PAYMENT_ISSUE',
      priority: 'HIGH',
      title: 'Payment Verification Required - FR Install Order',
      description: 'Customer deposit of €2,500 not yet received. Execution blocked until payment confirmed.',
      status: 'PENDING',
      assignedToId: operators[1].id,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      metadata: JSON.stringify({
        serviceOrderId: installOrderFR.id,
        paymentAmount: 2500,
        currency: 'EUR',
      }),
      countryCode: 'FR',
    },
  });

  console.log(`✅ Go Exec monitoring set up (1 OK, 1 NOK with task)`);

  // ==================== STEP 14: FIELD EXECUTION WITH CHECKLIST ====================
  console.log('1️⃣4️⃣ Creating field executions...');

  // ES execution (in progress)
  const executionES = await prisma.execution.create({
    data: {
      serviceOrderId: tvOrderES.id,
      workTeamId: workTeams[0].id,
      status: 'IN_PROGRESS',
      canCheckIn: true,
      checkInAt: new Date(),
      checkInLat: 40.4168,
      checkInLon: -3.7038,
      checklistItems: JSON.stringify([
        { id: 'roof_access', label: 'Verify roof access', required: true, completed: true, completedAt: new Date() },
        { id: 'measure_area', label: 'Measure available area', required: true, completed: true, completedAt: new Date() },
        { id: 'check_electrical', label: 'Check electrical panel compatibility', required: true, completed: false },
        { id: 'assess_shading', label: 'Assess shading patterns', required: true, completed: false },
        { id: 'customer_walkthrough', label: 'Customer walkthrough and questions', required: true, completed: false },
      ]),
      checklistCompletion: 40, // 2/5 items done
      photos: JSON.stringify([
        {
          url: 's3://executions/tv-es-001/roof-before-1.jpg',
          type: 'before',
          caption: 'Roof current state - south facing',
          uploadedAt: new Date(),
        },
        {
          url: 's3://executions/tv-es-001/electrical-panel.jpg',
          type: 'before',
          caption: 'Existing electrical panel',
          uploadedAt: new Date(),
        },
      ]),
    },
  });

  console.log(`✅ Created execution (in-progress with checklist and photos)`);

  // FR execution (blocked by Go Exec)
  const executionFR = await prisma.execution.create({
    data: {
      serviceOrderId: installOrderFR.id,
      workTeamId: workTeams[1].id,
      status: 'PENDING',
      canCheckIn: false, // Blocked!
      blockedReason: 'Customer payment not verified (€2,500 deposit pending)',
      checklistItems: JSON.stringify([
        { id: 'site_prep', label: 'Site preparation check', required: true, completed: false },
        { id: 'materials_verify', label: 'Verify all materials delivered', required: true, completed: false },
        { id: 'cabinet_install', label: 'Install base cabinets', required: true, completed: false },
        { id: 'countertop', label: 'Install countertop', required: true, completed: false },
        { id: 'plumbing', label: 'Plumbing connections', required: true, completed: false },
        { id: 'electrical', label: 'Electrical connections', required: true, completed: false },
        { id: 'appliances', label: 'Install appliances', required: true, completed: false },
        { id: 'quality_check', label: 'Final quality check', required: true, completed: false },
      ]),
      checklistCompletion: 0,
    },
  });

  // Create alert for blocked execution
  await prisma.alert.create({
    data: {
      type: 'GO_EXEC_BLOCKED',
      severity: 'ERROR',
      title: 'Execution Blocked - Payment Issue',
      message: `Execution for ${installOrderFR.externalId} blocked due to pending payment. Technician cannot check-in until resolved.`,
      metadata: JSON.stringify({
        serviceOrderId: installOrderFR.id,
        executionId: executionFR.id,
        blockReason: 'Payment not verified',
      }),
      acknowledged: false,
      countryCode: 'FR',
    },
  });

  console.log(`✅ Created blocked execution (awaiting payment)`);

  // ==================== STEP 15: COMPLETED EXECUTION SCENARIO ====================
  console.log('1️⃣5️⃣ Creating completed execution with WCF...');

  // Create another completed service order for WCF demo
  const projectES2 = await prisma.project.create({
    data: {
      externalId: 'PROJ-ES-2024-002',
      countryCode: 'ES',
      buCode: buES.code,
      storeCode: stores[0].code,
      worksiteStreet: 'Calle Serrano 88',
      worksiteCity: 'Madrid',
      worksiteZip: '28006',
      projectType: 'BATHROOM_INSTALLATION',
      customerName: 'Ana López',
      customerEmail: 'ana.lopez@example.com',
      customerPhone: '+34666777888',
      totalHoursEstimated: 12,
      status: 'ACTIVE',
      responsibleOperatorId: operators[0].id,
      assignmentMode: 'AUTO',
    },
  });

  const completedSO = await prisma.serviceOrder.create({
    data: {
      projectId: projectES2.id,
      externalId: 'SO-INST-ES-002',
      serviceType: 'INSTALLATION',
      priority: 'P2',
      countryCode: 'ES',
      buCode: buES.code,
      status: 'COMPLETED',
      scheduledDate: new Date('2024-11-20T08:00:00Z'),
      estimatedDuration: 6,
      customerName: 'Ana López',
      customerEmail: 'ana.lopez@example.com',
      goExecStatus: 'OK',
      paymentStatus: 'VERIFIED',
      contractStatus: 'SIGNED',
    },
  });

  const completedAssignment = await prisma.assignment.create({
    data: {
      serviceOrderId: completedSO.id,
      providerId: providerES_Tier1.id,
      workTeamId: workTeams[0].id,
      status: 'ACCEPTED',
      assignmentMode: 'DIRECT',
      proposedDate: new Date('2024-11-20T08:00:00Z'),
      originalDate: new Date('2024-11-20T08:00:00Z'),
      dateNegotiationRound: 0,
      acceptedAt: new Date('2024-11-15T10:00:00Z'),
      acceptedDate: new Date('2024-11-20T08:00:00Z'),
    },
  });

  const completedExecution = await prisma.execution.create({
    data: {
      serviceOrderId: completedSO.id,
      workTeamId: workTeams[0].id,
      status: 'COMPLETED',
      canCheckIn: true,
      checkInAt: new Date('2024-11-20T08:15:00Z'),
      checkInLat: 40.4265,
      checkInLon: -3.6885,
      checkOutAt: new Date('2024-11-20T14:30:00Z'),
      checkOutLat: 40.4265,
      checkOutLon: -3.6885,
      actualHours: 6.25,
      checklistItems: JSON.stringify([
        { id: 'remove_old', label: 'Remove old fixtures', required: true, completed: true },
        { id: 'plumbing', label: 'Install new plumbing', required: true, completed: true },
        { id: 'tiles', label: 'Install tiles', required: true, completed: true },
        { id: 'fixtures', label: 'Install new fixtures', required: true, completed: true },
        { id: 'cleanup', label: 'Site cleanup', required: true, completed: true },
      ]),
      checklistCompletion: 100,
      completionStatus: 'COMPLETE',
      photos: JSON.stringify([
        { url: 's3://executions/inst-es-002/before-1.jpg', type: 'before' },
        { url: 's3://executions/inst-es-002/after-1.jpg', type: 'after' },
        { url: 's3://executions/inst-es-002/after-2.jpg', type: 'after' },
      ]),
      audioRecordings: JSON.stringify([
        {
          url: 's3://executions/inst-es-002/technician-notes.m4a',
          duration: 45,
          notes: 'Customer very satisfied, requested additional work quote',
        },
      ]),
      customerRating: 5,
      customerFeedback: '¡Excelente trabajo! Muy profesionales y rápidos.',
      customerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
    },
  });

  // ==================== STEP 16: WCF WITH CUSTOMER ACCEPTANCE ====================
  console.log('1️⃣6️⃣ Creating WCF with customer acceptance...');

  const wcf = await prisma.wCF.create({
    data: {
      serviceOrderId: completedSO.id,
      executionId: completedExecution.id,
      status: 'SIGNED_OK',
      generatedAt: new Date('2024-11-20T14:35:00Z'),
      sentAt: new Date('2024-11-20T14:40:00Z'),
      wcfPdfUrl: 's3://wcf/inst-es-002.pdf',
      signatureType: 'DIGITAL',
      signatureMethod: 'IN_APP',
      signedAt: new Date('2024-11-20T14:45:00Z'),
      customerName: 'Ana López',
      customerEmail: 'ana.lopez@example.com',
      actualHours: 6.25,
      materialsUsed: JSON.stringify([
        { item: 'Bathroom sink', quantity: 1, reference: 'SINK-001' },
        { item: 'Wall tiles', quantity: 50, reference: 'TILE-WHT-20x20' },
        { item: 'Faucet set', quantity: 1, reference: 'FAUCET-CHR-001' },
      ]),
      workPhotos: JSON.stringify([
        's3://executions/inst-es-002/after-1.jpg',
        's3://executions/inst-es-002/after-2.jpg',
      ]),
      customerRating: 5,
      customerFeedback: '¡Excelente trabajo! Muy profesionales y rápidos.',
      customerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
    },
  });

  console.log(`✅ Created WCF (signed OK with 5-star rating)`);

  // ==================== STEP 17: WCF WITH RESERVES ====================
  console.log('1️⃣7️⃣ Creating WCF with customer reserves...');

  // Create another scenario with reserves
  const projectFR2 = await prisma.project.create({
    data: {
      externalId: 'PROJ-FR-2024-002',
      countryCode: 'FR',
      buCode: buFR.code,
      storeCode: stores[1].code,
      worksiteStreet: '45 Rue de Rivoli',
      worksiteCity: 'Paris',
      worksiteZip: '75001',
      projectType: 'FLOORING_INSTALLATION',
      customerName: 'Luc Bernard',
      customerEmail: 'luc.bernard@example.com',
      customerPhone: '+33677889900',
      totalHoursEstimated: 8,
      status: 'ACTIVE',
      responsibleOperatorId: operators[1].id,
      assignmentMode: 'MANUAL',
    },
  });

  const soWithReserves = await prisma.serviceOrder.create({
    data: {
      projectId: projectFR2.id,
      externalId: 'SO-INST-FR-002',
      serviceType: 'INSTALLATION',
      priority: 'P2',
      countryCode: 'FR',
      buCode: buFR.code,
      status: 'COMPLETED',
      scheduledDate: new Date('2024-11-22T09:00:00Z'),
      estimatedDuration: 8,
      customerName: 'Luc Bernard',
      customerEmail: 'luc.bernard@example.com',
      goExecStatus: 'OK',
      paymentStatus: 'VERIFIED',
      contractStatus: 'SIGNED',
    },
  });

  const assignmentWithReserves = await prisma.assignment.create({
    data: {
      serviceOrderId: soWithReserves.id,
      providerId: providerFR_OnWatch.id,
      workTeamId: workTeams[2].id,
      status: 'ACCEPTED',
      assignmentMode: 'DIRECT',
      proposedDate: new Date('2024-11-22T09:00:00Z'),
      originalDate: new Date('2024-11-22T09:00:00Z'),
      dateNegotiationRound: 0,
      acceptedAt: new Date('2024-11-18T11:00:00Z'),
      acceptedDate: new Date('2024-11-22T09:00:00Z'),
    },
  });

  const executionWithReserves = await prisma.execution.create({
    data: {
      serviceOrderId: soWithReserves.id,
      workTeamId: workTeams[2].id,
      status: 'COMPLETED',
      canCheckIn: true,
      checkInAt: new Date('2024-11-22T09:20:00Z'),
      checkInLat: 48.8606,
      checkInLon: 2.3376,
      checkOutAt: new Date('2024-11-22T18:15:00Z'),
      checkOutLat: 48.8606,
      checkOutLon: 2.3376,
      actualHours: 8.92,
      completionStatus: 'INCOMPLETE',
      incompleteReason: 'Corner sections require additional work due to uneven subfloor',
      checklistCompletion: 85,
      customerRating: 3,
      customerFeedback: 'Certaines sections ne sont pas parfaitement alignées. Nécessite des retouches.',
    },
  });

  const wcfWithReserves = await prisma.wCF.create({
    data: {
      serviceOrderId: soWithReserves.id,
      executionId: executionWithReserves.id,
      status: 'SIGNED_WITH_RESERVES',
      generatedAt: new Date('2024-11-22T18:20:00Z'),
      sentAt: new Date('2024-11-22T18:25:00Z'),
      wcfPdfUrl: 's3://wcf/inst-fr-002.pdf',
      signatureType: 'DIGITAL',
      signatureMethod: 'IN_APP',
      signedAt: new Date('2024-11-22T18:30:00Z'),
      customerName: 'Luc Bernard',
      customerEmail: 'luc.bernard@example.com',
      actualHours: 8.92,
      customerRating: 3,
      customerFeedback: 'Certaines sections ne sont pas parfaitement alignées. Nécessite des retouches.',
      customerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
    },
  });

  // Add reserves
  await Promise.all([
    prisma.wCFReserve.create({
      data: {
        wcfId: wcfWithReserves.id,
        category: 'QUALITY',
        description: 'Corner sections not perfectly aligned - visible gaps',
        severity: 'MEDIUM',
      },
    }),
    prisma.wCFReserve.create({
      data: {
        wcfId: wcfWithReserves.id,
        category: 'INCOMPLETE_WORK',
        description: 'Two corner sections require rework due to uneven subfloor',
        severity: 'HIGH',
      },
    }),
  ]);

  // Create task for follow-up
  await prisma.task.create({
    data: {
      type: 'WCF_RESERVES',
      priority: 'URGENT',
      title: 'WCF Signed with Reserves - Follow-up Required',
      description: 'Customer signed WCF with 2 quality reserves. Schedule follow-up visit to address corner alignment issues.',
      status: 'PENDING',
      assignedToId: operators[1].id,
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
      metadata: JSON.stringify({
        serviceOrderId: soWithReserves.id,
        wcfId: wcfWithReserves.id,
        reserves: 2,
        estimatedFollowUpHours: 2,
      }),
      countryCode: 'FR',
    },
  });

  console.log(`✅ Created WCF with reserves (quality issues, follow-up task created)`);

  // ==================== STEP 18: TIMEOUT & ALERTS ====================
  console.log('1️⃣8️⃣ Creating timeout scenario with alerts...');

  // Create expired assignment offer
  const expiredProject = await prisma.project.create({
    data: {
      externalId: 'PROJ-FR-2024-003',
      countryCode: 'FR',
      buCode: buFR.code,
      worksiteStreet: '10 Boulevard Haussmann',
      worksiteCity: 'Paris',
      worksiteZip: '75009',
      projectType: 'ELECTRICAL_WORK',
      customerName: 'Sophie Rousseau',
      customerEmail: 'sophie.rousseau@example.com',
      totalHoursEstimated: 4,
      status: 'ACTIVE',
      responsibleOperatorId: operators[2].id,
      assignmentMode: 'MANUAL',
    },
  });

  const expiredSO = await prisma.serviceOrder.create({
    data: {
      projectId: expiredProject.id,
      externalId: 'SO-INST-FR-003',
      serviceType: 'INSTALLATION',
      priority: 'P1',
      countryCode: 'FR',
      buCode: buFR.code,
      status: 'CREATED',
      scheduledDate: new Date('2024-11-28T10:00:00Z'),
      estimatedDuration: 4,
      customerName: 'Sophie Rousseau',
    },
  });

  const expiredAssignment = await prisma.assignment.create({
    data: {
      serviceOrderId: expiredSO.id,
      providerId: providerFR_Tier2.id,
      workTeamId: workTeams[1].id,
      status: 'TIMEOUT', // Expired!
      assignmentMode: 'DIRECT',
      proposedDate: new Date('2024-11-28T10:00:00Z'),
      originalDate: new Date('2024-11-28T10:00:00Z'),
      dateNegotiationRound: 0,
      offerExpiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Expired 2h ago
    },
  });

  // Create timeout alert
  await prisma.alert.create({
    data: {
      type: 'ASSIGNMENT_TIMEOUT',
      severity: 'CRITICAL',
      title: 'Assignment Offer Timed Out',
      message: `Provider did not respond within 4 hours for ${expiredSO.externalId}. Manual reassignment required.`,
      metadata: JSON.stringify({
        serviceOrderId: expiredSO.id,
        assignmentId: expiredAssignment.id,
        providerId: providerFR_Tier2.id,
        expiredAt: expiredAssignment.offerExpiresAt,
      }),
      acknowledged: false,
      countryCode: 'FR',
    },
  });

  // Create manual assignment task
  await prisma.task.create({
    data: {
      type: 'MANUAL_ASSIGNMENT',
      priority: 'URGENT',
      title: 'Manual Reassignment Required - Timeout',
      description: `Provider Artisan Services Paris did not respond to offer for ${expiredSO.externalId}. Please manually assign to another provider.`,
      status: 'PENDING',
      assignedToId: operators[2].id,
      dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4h
      metadata: JSON.stringify({
        serviceOrderId: expiredSO.id,
        originalProviderId: providerFR_Tier2.id,
        reason: 'Provider timeout',
      }),
      countryCode: 'FR',
    },
  });

  console.log(`✅ Created timeout scenario with alerts and manual assignment task`);

  // ==================== FINAL STATISTICS ====================
  console.log('\n📊 Final Statistics:');

  const counts = await Promise.all([
    prisma.country.count(),
    prisma.businessUnit.count(),
    prisma.store.count(),
    prisma.user.count(),
    prisma.provider.count(),
    prisma.workTeam.count(),
    prisma.project.count(),
    prisma.serviceOrder.count(),
    prisma.assignment.count(),
    prisma.contract.count(),
    prisma.execution.count(),
    prisma.wCF.count(),
    prisma.task.count(),
    prisma.alert.count(),
  ]);

  console.log(`
✅ Seed completed successfully!

📦 Created:
  - ${counts[0]} Countries
  - ${counts[1]} Business Units
  - ${counts[2]} Stores
  - ${counts[3]} Operators
  - ${counts[4]} Providers (Tier 1: 1, Tier 2: 1, Tier 3: 1)
  - ${counts[5]} Work Teams
  - ${counts[6]} Projects (AUTO: 3, MANUAL: 3)
  - ${counts[7]} Service Orders (TV: 1, Install: 5)
  - ${counts[8]} Assignments (Accepted: 2, Pending: 1, Timeout: 1)
  - ${counts[9]} Contracts (Signed: 1)
  - ${counts[10]} Executions (In-Progress: 1, Completed: 2, Blocked: 1)
  - ${counts[11]} WCFs (OK: 1, Reserves: 1)
  - ${counts[12]} Tasks (Pending: 3)
  - ${counts[13]} Alerts (Critical: 1, Error: 1, Warning: 1)

🎯 Workflow Scenarios:
  ✓ Step 1: Country configuration (auto-accept ES/IT, manual FR/PL)
  ✓ Step 2: Project auto-assignment (ES/IT) vs manual (FR/PL)
  ✓ Step 3: Sales integration (PYXIS, TEMPO)
  ✓ Step 4: AI sales potential assessment (HIGH, €15k)
  ✓ Step 5: AI risk assessment (MEDIUM, acknowledged)
  ✓ Step 6: Assignment transparency with scoring
  ✓ Step 7: Provider acceptance + date negotiation
  ✓ Step 8: Contract e-signature (DocuSign)
  ✓ Step 9: Go Exec monitoring (1 OK, 1 NOK blocking execution)
  ✓ Step 10: Field execution with checklist, photos, audio
  ✓ Step 11: WCF with customer rating (5-star)
  ✓ Step 12: WCF with reserves (quality issues + follow-up task)
  ✓ Step 13: Assignment timeout + alerts + manual reassignment

🚀 Ready for roadshow demonstration!
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
