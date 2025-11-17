import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // ============================================================================
  // 1. SEED ROLES & PERMISSIONS
  // ============================================================================
  console.log('\n📋 Seeding roles and permissions...');

  // Create permissions
  const permissions = [
    // Users
    { resource: 'users', action: 'create', description: 'Create users' },
    { resource: 'users', action: 'read', description: 'View users' },
    { resource: 'users', action: 'update', description: 'Update users' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    { resource: 'users', action: 'manage_roles', description: 'Manage user roles' },

    // Providers
    { resource: 'providers', action: 'create', description: 'Create providers' },
    { resource: 'providers', action: 'read', description: 'View providers' },
    { resource: 'providers', action: 'update', description: 'Update providers' },
    { resource: 'providers', action: 'delete', description: 'Delete providers' },

    // Work Teams
    { resource: 'work_teams', action: 'create', description: 'Create work teams' },
    { resource: 'work_teams', action: 'read', description: 'View work teams' },
    { resource: 'work_teams', action: 'update', description: 'Update work teams' },
    { resource: 'work_teams', action: 'delete', description: 'Delete work teams' },

    // Technicians
    { resource: 'technicians', action: 'create', description: 'Create technicians' },
    { resource: 'technicians', action: 'read', description: 'View technicians' },
    { resource: 'technicians', action: 'update', description: 'Update technicians' },
    { resource: 'technicians', action: 'delete', description: 'Delete technicians' },

    // Config
    { resource: 'config', action: 'read', description: 'View configuration' },
    { resource: 'config', action: 'update', description: 'Update configuration' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System administrator with full access',
    },
  });

  const operatorRole = await prisma.role.upsert({
    where: { name: 'OPERATOR' },
    update: {},
    create: {
      name: 'OPERATOR',
      description: 'Operations staff managing service orders',
    },
  });

  const providerManagerRole = await prisma.role.upsert({
    where: { name: 'PROVIDER_MANAGER' },
    update: {},
    create: {
      name: 'PROVIDER_MANAGER',
      description: 'Provider company manager',
    },
  });

  const technicianRole = await prisma.role.upsert({
    where: { name: 'TECHNICIAN' },
    update: {},
    create: {
      name: 'TECHNICIAN',
      description: 'Field technician',
    },
  });

  console.log('✅ Created 4 roles');

  // Assign all permissions to ADMIN role
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ Assigned all permissions to ADMIN role');

  // Assign permissions to OPERATOR role
  const operatorPermissions = allPermissions.filter(
    (p) => p.resource !== 'users' && p.resource !== 'config',
  );
  for (const permission of operatorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: operatorRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: operatorRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ Assigned permissions to OPERATOR role');

  // ============================================================================
  // 2. SEED ADMIN USER
  // ============================================================================
  console.log('\n👤 Seeding admin user...');

  const adminPassword = await bcrypt.hash('Admin123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@adeo.com' },
    update: {
      password: adminPassword, // Update password to ensure it's correct
      firstName: 'Admin',
      lastName: 'User',
    },
    create: {
      email: 'admin@adeo.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
      isActive: true,
      isVerified: true,
    },
  });

  // Assign ADMIN role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Admin user created/updated with password: Admin123!');

  // ============================================================================
  // 3. SEED TEST USERS
  // ============================================================================
  console.log('\n👥 Seeding test users...');

  const operatorPassword = await bcrypt.hash('Operator123!', 10);
  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator@adeo.com' },
    update: {},
    create: {
      email: 'operator@adeo.com',
      password: operatorPassword,
      firstName: 'Test',
      lastName: 'Operator',
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
      isActive: true,
      isVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: operatorUser.id,
        roleId: operatorRole.id,
      },
    },
    update: {},
    create: {
      userId: operatorUser.id,
      roleId: operatorRole.id,
    },
  });

  console.log('✅ Test operator created');

  // ============================================================================
  // 4. SEED GEOGRAPHIC MASTER DATA
  // ============================================================================
  console.log('\n🌍 Seeding geographic master data...');

  // Countries
  const countries = [
    { code: 'ES', name: 'Spain', timezone: 'Europe/Madrid', currency: 'EUR', locale: 'es-ES' },
    { code: 'FR', name: 'France', timezone: 'Europe/Paris', currency: 'EUR', locale: 'fr-FR' },
    { code: 'IT', name: 'Italy', timezone: 'Europe/Rome', currency: 'EUR', locale: 'it-IT' },
    { code: 'PL', name: 'Poland', timezone: 'Europe/Warsaw', currency: 'PLN', locale: 'pl-PL' },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: country,
    });
  }
  console.log('✅ Created 4 countries');

  // Sample provinces (Madrid for ES, Île-de-France for FR)
  const madridProvince = await prisma.province.upsert({
    where: { countryCode_code: { countryCode: 'ES', code: '28' } },
    update: {},
    create: {
      countryCode: 'ES',
      code: '28',
      name: 'Madrid',
    },
  });

  const parisProvince = await prisma.province.upsert({
    where: { countryCode_code: { countryCode: 'FR', code: '75' } },
    update: {},
    create: {
      countryCode: 'FR',
      code: '75',
      name: 'Paris',
    },
  });

  console.log('✅ Created 2 sample provinces');

  // Sample cities
  const madridCity = await prisma.city.upsert({
    where: { provinceId_code: { provinceId: madridProvince.id, code: 'MAD' } },
    update: {},
    create: {
      provinceId: madridProvince.id,
      code: 'MAD',
      name: 'Madrid',
    },
  });

  const parisCity = await prisma.city.upsert({
    where: { provinceId_code: { provinceId: parisProvince.id, code: 'PAR' } },
    update: {},
    create: {
      provinceId: parisProvince.id,
      code: 'PAR',
      name: 'Paris',
    },
  });

  console.log('✅ Created 2 sample cities');

  // Sample postal codes
  const samplePostalCodes = [
    { cityId: madridCity.id, code: '28001' },
    { cityId: madridCity.id, code: '28002' },
    { cityId: madridCity.id, code: '28003' },
    { cityId: parisCity.id, code: '75001' },
    { cityId: parisCity.id, code: '75002' },
    { cityId: parisCity.id, code: '75003' },
  ];

  for (const postalCode of samplePostalCodes) {
    await prisma.postalCode.upsert({
      where: { cityId_code: { cityId: postalCode.cityId, code: postalCode.code } },
      update: {},
      create: postalCode,
    });
  }

  console.log('✅ Created 6 sample postal codes');

  // ============================================================================
  // 5. SEED PROVIDER SPECIALTIES
  // ============================================================================
  console.log('\n🔧 Seeding provider specialties...');

  const specialties = [
    // HVAC Specialties
    { code: 'HVAC_INSTALL', name: 'HVAC Installation', category: 'HVAC', requiresCertification: true, certificationAuthority: 'Spanish HVAC Association' },
    { code: 'HVAC_REPAIR', name: 'HVAC Repair & Maintenance', category: 'HVAC', requiresCertification: true, certificationAuthority: 'Spanish HVAC Association' },
    { code: 'AC_INSTALL', name: 'Air Conditioning Installation', category: 'HVAC', requiresCertification: true, certificationAuthority: 'Spanish HVAC Association' },

    // Plumbing Specialties
    { code: 'PLUMB_INSTALL', name: 'Plumbing Installation', category: 'PLUMBING', requiresCertification: true, certificationAuthority: 'National Plumbing Certification' },
    { code: 'PLUMB_REPAIR', name: 'Plumbing Repair', category: 'PLUMBING', requiresCertification: false, certificationAuthority: null },
    { code: 'WATER_HEATER', name: 'Water Heater Installation', category: 'PLUMBING', requiresCertification: true, certificationAuthority: 'National Plumbing Certification' },

    // Electrical Specialties
    { code: 'ELEC_INSTALL', name: 'Electrical Installation', category: 'ELECTRICAL', requiresCertification: true, certificationAuthority: 'National Electrical Certification' },
    { code: 'ELEC_REPAIR', name: 'Electrical Repair', category: 'ELECTRICAL', requiresCertification: true, certificationAuthority: 'National Electrical Certification' },

    // Kitchen Specialties
    { code: 'KITCHEN_FULL', name: 'Full Kitchen Installation', category: 'KITCHEN', requiresCertification: false, certificationAuthority: null },
    { code: 'APPLIANCE_INSTALL', name: 'Kitchen Appliance Installation', category: 'KITCHEN', requiresCertification: false, certificationAuthority: null },

    // Bathroom Specialties
    { code: 'BATHROOM_FULL', name: 'Full Bathroom Installation', category: 'BATHROOM', requiresCertification: false, certificationAuthority: null },
    { code: 'SHOWER_INSTALL', name: 'Shower Installation', category: 'BATHROOM', requiresCertification: false, certificationAuthority: null },

    // Flooring Specialties
    { code: 'FLOOR_TILE', name: 'Tile Flooring Installation', category: 'FLOORING', requiresCertification: false, certificationAuthority: null },
    { code: 'FLOOR_WOOD', name: 'Wood Flooring Installation', category: 'FLOORING', requiresCertification: false, certificationAuthority: null },

    // Windows & Doors
    { code: 'WINDOW_INSTALL', name: 'Window Installation', category: 'WINDOWS_DOORS', requiresCertification: false, certificationAuthority: null },
    { code: 'DOOR_INSTALL', name: 'Door Installation', category: 'WINDOWS_DOORS', requiresCertification: false, certificationAuthority: null },

    // Garden
    { code: 'GARDEN_INSTALL', name: 'Garden Installation', category: 'GARDEN', requiresCertification: false, certificationAuthority: null },

    // Furniture
    { code: 'FURNITURE_ASSEMBLY', name: 'Furniture Assembly', category: 'FURNITURE', requiresCertification: false, certificationAuthority: null },
  ];

  for (const specialty of specialties) {
    await prisma.providerSpecialty.upsert({
      where: { code: specialty.code },
      update: {},
      create: specialty,
    });
  }

  console.log(`✅ Created ${specialties.length} provider specialties`);

  // ============================================================================
  // 6. SEED CONTRACT TEMPLATES
  // ============================================================================
  console.log('\n📄 Seeding contract templates...');

  const contractTemplates = [
    {
      code: 'INSTALL_STD_V1',
      name: 'Standard Installation Contract',
      description: 'Standard pre-service contract for installation services',
      countryCode: 'ES',
      businessUnit: null, // Applies to all BUs in ES
      externalTemplateId: 'ADOBE_ES_INSTALL_001',
      provider: 'ADOBE_SIGN',
      version: 1,
      isActive: true,
    },
    {
      code: 'TV_CONFIRM_V1',
      name: 'Technical Visit Confirmation Contract',
      description: 'Contract for confirmation technical visits',
      countryCode: 'ES',
      businessUnit: null,
      externalTemplateId: 'ADOBE_ES_TV_CONF_001',
      provider: 'ADOBE_SIGN',
      version: 1,
      isActive: true,
    },
    {
      code: 'TV_QUOTATION_V1',
      name: 'Technical Visit Quotation Contract',
      description: 'Contract for quotation technical visits',
      countryCode: 'ES',
      businessUnit: null,
      externalTemplateId: 'ADOBE_ES_TV_QUOT_001',
      provider: 'ADOBE_SIGN',
      version: 1,
      isActive: true,
    },
    {
      code: 'INSTALL_STD_FR_V1',
      name: 'Contrat d\'installation standard',
      description: 'Contrat pré-service standard pour les services d\'installation',
      countryCode: 'FR',
      businessUnit: null,
      externalTemplateId: 'ADOBE_FR_INSTALL_001',
      provider: 'ADOBE_SIGN',
      version: 1,
      isActive: true,
    },
  ];

  for (const template of contractTemplates) {
    await prisma.contractTemplate.upsert({
      where: { code: template.code },
      update: {},
      create: template,
    });
  }

  console.log(`✅ Created ${contractTemplates.length} contract templates`);

  // ============================================================================
  // 7. SEED SAMPLE SERVICE CATALOG
  // ============================================================================
  console.log('\n📦 Seeding sample service catalog...');

  const hvacInstallTemplate = await prisma.contractTemplate.findUnique({
    where: { code: 'INSTALL_STD_V1' },
  });

  const sampleServices = [
    {
      externalServiceCode: 'PYX_ES_HVAC_001',
      fsmServiceCode: 'SVC_ES_HVAC_001',
      externalSource: 'PYXIS',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      serviceType: 'INSTALLATION',
      serviceCategory: 'HVAC',
      name: 'Air Conditioning Installation - Standard',
      description: 'Standard air conditioning unit installation (up to 3.5kW)',
      scopeIncluded: ['Remove old unit (if any)', 'Install new unit', 'Connect to electrical outlet', 'Test functionality'],
      scopeExcluded: ['Electrical wiring modifications', 'Wall modifications', 'Outdoor unit bracket installation'],
      worksiteRequirements: ['Electrical outlet within 2m', 'Clear access to installation location', 'Outdoor unit mounting location prepared'],
      productPrerequisites: ['AC unit pre-delivered', 'Installation kit included'],
      estimatedDurationMinutes: 180,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      contractTemplateId: hvacInstallTemplate?.id,
      status: 'ACTIVE',
      syncChecksum: 'abc123def456',
      lastSyncedAt: new Date(),
      createdBy: 'SEED_SCRIPT',
    },
    {
      externalServiceCode: 'PYX_ES_PLUMB_001',
      fsmServiceCode: 'SVC_ES_PLUMB_001',
      externalSource: 'PYXIS',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      serviceType: 'INSTALLATION',
      serviceCategory: 'PLUMBING',
      name: 'Water Heater Installation',
      description: 'Electric water heater installation (50-100L capacity)',
      scopeIncluded: ['Remove old water heater', 'Install new water heater', 'Connect plumbing', 'Connect electrical', 'Test for leaks'],
      scopeExcluded: ['Pipe modifications beyond 1m', 'Electrical circuit installation'],
      worksiteRequirements: ['Water supply accessible', 'Electrical connection available', 'Mounting location prepared'],
      productPrerequisites: ['Water heater pre-delivered', 'Installation materials included'],
      estimatedDurationMinutes: 240,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      contractTemplateId: hvacInstallTemplate?.id,
      status: 'ACTIVE',
      syncChecksum: 'def456ghi789',
      lastSyncedAt: new Date(),
      createdBy: 'SEED_SCRIPT',
    },
    {
      externalServiceCode: 'PYX_ES_KITCHEN_001',
      fsmServiceCode: 'SVC_ES_KITCHEN_001',
      externalSource: 'PYXIS',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      serviceType: 'INSTALLATION',
      serviceCategory: 'KITCHEN',
      name: 'Full Kitchen Installation',
      description: 'Complete kitchen installation including cabinets, countertop, sink, and appliances',
      scopeIncluded: ['Cabinet assembly and installation', 'Countertop installation', 'Sink and faucet installation', 'Appliance installation (oven, dishwasher, hood)', 'Final adjustments and cleanup'],
      scopeExcluded: ['Plumbing line modifications', 'Electrical wiring beyond connecting appliances', 'Wall/floor tile work'],
      worksiteRequirements: ['Kitchen space cleared and prepared', 'Plumbing and electrical connections ready', 'Floor level'],
      productPrerequisites: ['All kitchen components pre-delivered', 'Assembly instructions available'],
      estimatedDurationMinutes: 960, // 2 days
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      contractTemplateId: hvacInstallTemplate?.id,
      status: 'ACTIVE',
      syncChecksum: 'ghi789jkl012',
      lastSyncedAt: new Date(),
      createdBy: 'SEED_SCRIPT',
    },
  ];

  for (const service of sampleServices) {
    await prisma.serviceCatalog.upsert({
      where: { externalServiceCode: service.externalServiceCode },
      update: {},
      create: service,
    });
  }

  console.log(`✅ Created ${sampleServices.length} sample services`);

  // ============================================================================
  // 8. SEED SERVICE PRICING
  // ============================================================================
  console.log('\n💰 Seeding service pricing...');

  const hvacService = await prisma.serviceCatalog.findUnique({
    where: { externalServiceCode: 'PYX_ES_HVAC_001' },
  });

  const plumbingService = await prisma.serviceCatalog.findUnique({
    where: { externalServiceCode: 'PYX_ES_PLUMB_001' },
  });

  const kitchenService = await prisma.serviceCatalog.findUnique({
    where: { externalServiceCode: 'PYX_ES_KITCHEN_001' },
  });

  const madridPostalCode = await prisma.postalCode.findUnique({
    where: { cityId_code: { cityId: madridCity.id, code: '28001' } },
  });

  const pricingData = [
    // HVAC pricing - Country default (ES)
    {
      serviceId: hvacService?.id!,
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      postalCodeId: null, // Country default
      baseRate: 150.00,
      currency: 'EUR',
      rateType: 'FIXED',
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    // HVAC pricing - Madrid premium
    {
      serviceId: hvacService?.id!,
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      postalCodeId: madridPostalCode?.id!,
      baseRate: 175.00, // 16% higher in Madrid
      currency: 'EUR',
      rateType: 'FIXED',
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    // Plumbing pricing - Country default
    {
      serviceId: plumbingService?.id!,
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      postalCodeId: null,
      baseRate: 200.00,
      currency: 'EUR',
      rateType: 'FIXED',
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    // Kitchen pricing - Country default
    {
      serviceId: kitchenService?.id!,
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      postalCodeId: null,
      baseRate: 1200.00,
      currency: 'EUR',
      rateType: 'FIXED',
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
  ];

  for (const pricing of pricingData) {
    if (pricing.serviceId) {
      await prisma.servicePricing.create({
        data: pricing,
      });
    }
  }

  console.log(`✅ Created ${pricingData.length} pricing entries`);

  // ============================================================================
  // 9. SEED SERVICE SKILL REQUIREMENTS
  // ============================================================================
  console.log('\n🎓 Seeding service skill requirements...');

  const hvacInstallSpecialty = await prisma.providerSpecialty.findUnique({
    where: { code: 'HVAC_INSTALL' },
  });

  const plumbInstallSpecialty = await prisma.providerSpecialty.findUnique({
    where: { code: 'PLUMB_INSTALL' },
  });

  const waterHeaterSpecialty = await prisma.providerSpecialty.findUnique({
    where: { code: 'WATER_HEATER' },
  });

  const kitchenSpecialty = await prisma.providerSpecialty.findUnique({
    where: { code: 'KITCHEN_FULL' },
  });

  const skillRequirements = [
    // HVAC service requires HVAC installation specialty
    {
      serviceId: hvacService?.id!,
      specialtyId: hvacInstallSpecialty?.id!,
      isRequired: true,
      minimumExperience: 'INTERMEDIATE',
    },
    // Plumbing service requires plumbing and water heater specialties
    {
      serviceId: plumbingService?.id!,
      specialtyId: plumbInstallSpecialty?.id!,
      isRequired: true,
      minimumExperience: 'INTERMEDIATE',
    },
    {
      serviceId: plumbingService?.id!,
      specialtyId: waterHeaterSpecialty?.id!,
      isRequired: true,
      minimumExperience: 'INTERMEDIATE',
    },
    // Kitchen service requires kitchen specialty
    {
      serviceId: kitchenService?.id!,
      specialtyId: kitchenSpecialty?.id!,
      isRequired: true,
      minimumExperience: 'SENIOR',
    },
  ];

  for (const requirement of skillRequirements) {
    if (requirement.serviceId && requirement.specialtyId) {
      await prisma.serviceSkillRequirement.create({
        data: requirement,
      });
    }
  }

  console.log(`✅ Created ${skillRequirements.length} service skill requirements`);

  // ============================================================================
  // 9. SEED CALENDAR CONFIGS (PRD BR-5 Compliant Buffer Settings)
  // ============================================================================
  console.log('\n📅 Seeding calendar configurations...');

  const calendarConfigs = [
    // Spain - Leroy Merlin
    {
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      workingDays: [1, 2, 3, 4, 5], // Monday-Friday
      timezone: 'Europe/Madrid',
      morningShiftStart: '08:00',
      morningShiftEnd: '14:00',
      afternoonShiftStart: '14:00',
      afternoonShiftEnd: '20:00',
      eveningShiftStart: null,
      eveningShiftEnd: null,
      globalBufferNonWorkingDays: 3, // Block bookings within 3 non-working days from today
      staticBufferNonWorkingDays: 2, // Block bookings within 2 non-working days from delivery
      travelBufferMinutes: 30, // Fixed 30 minutes between jobs
      crossDayAllowed: false,
      holidayRegion: 'ES', // Nager.Date API country code
      createdBy: 'system',
    },
    // Spain - Brico Depot
    {
      countryCode: 'ES',
      businessUnit: 'BD_ES',
      workingDays: [1, 2, 3, 4, 5],
      timezone: 'Europe/Madrid',
      morningShiftStart: '08:00',
      morningShiftEnd: '14:00',
      afternoonShiftStart: '14:00',
      afternoonShiftEnd: '20:00',
      eveningShiftStart: null,
      eveningShiftEnd: null,
      globalBufferNonWorkingDays: 3,
      staticBufferNonWorkingDays: 2,
      travelBufferMinutes: 30,
      crossDayAllowed: false,
      holidayRegion: 'ES',
      createdBy: 'system',
    },
    // France - Leroy Merlin
    {
      countryCode: 'FR',
      businessUnit: 'LM_FR',
      workingDays: [1, 2, 3, 4, 5],
      timezone: 'Europe/Paris',
      morningShiftStart: '08:00',
      morningShiftEnd: '13:00',
      afternoonShiftStart: '14:00',
      afternoonShiftEnd: '19:00',
      eveningShiftStart: null,
      eveningShiftEnd: null,
      globalBufferNonWorkingDays: 4, // France: slightly longer buffer
      staticBufferNonWorkingDays: 2,
      travelBufferMinutes: 45, // France: longer travel times
      crossDayAllowed: false,
      holidayRegion: 'FR',
      createdBy: 'system',
    },
    // France - Brico Depot
    {
      countryCode: 'FR',
      businessUnit: 'BD_FR',
      workingDays: [1, 2, 3, 4, 5],
      timezone: 'Europe/Paris',
      morningShiftStart: '08:00',
      morningShiftEnd: '13:00',
      afternoonShiftStart: '14:00',
      afternoonShiftEnd: '19:00',
      eveningShiftStart: null,
      eveningShiftEnd: null,
      globalBufferNonWorkingDays: 4,
      staticBufferNonWorkingDays: 2,
      travelBufferMinutes: 45,
      crossDayAllowed: false,
      holidayRegion: 'FR',
      createdBy: 'system',
    },
    // Italy - Leroy Merlin
    {
      countryCode: 'IT',
      businessUnit: 'LM_IT',
      workingDays: [1, 2, 3, 4, 5],
      timezone: 'Europe/Rome',
      morningShiftStart: '08:00',
      morningShiftEnd: '13:00',
      afternoonShiftStart: '14:00',
      afternoonShiftEnd: '19:00',
      eveningShiftStart: null,
      eveningShiftEnd: null,
      globalBufferNonWorkingDays: 3,
      staticBufferNonWorkingDays: 2,
      travelBufferMinutes: 30,
      crossDayAllowed: false,
      holidayRegion: 'IT',
      createdBy: 'system',
    },
    // Poland - Leroy Merlin
    {
      countryCode: 'PL',
      businessUnit: 'LM_PL',
      workingDays: [1, 2, 3, 4, 5],
      timezone: 'Europe/Warsaw',
      morningShiftStart: '08:00',
      morningShiftEnd: '14:00',
      afternoonShiftStart: '14:00',
      afternoonShiftEnd: '20:00',
      eveningShiftStart: null,
      eveningShiftEnd: null,
      globalBufferNonWorkingDays: 2, // Poland: shorter buffer
      staticBufferNonWorkingDays: 1,
      travelBufferMinutes: 30,
      crossDayAllowed: false,
      holidayRegion: 'PL',
      createdBy: 'system',
    },
  ];

  for (const config of calendarConfigs) {
    await prisma.calendarConfig.upsert({
      where: {
        countryCode_businessUnit: {
          countryCode: config.countryCode,
          businessUnit: config.businessUnit,
        },
      },
      update: config,
      create: config,
    });
  }

  console.log(`✅ Created ${calendarConfigs.length} calendar configurations`);

  console.log('\n✨ Database seeding completed!');
  console.log('\n📝 Test Credentials:');
  console.log('   Admin: admin@adeo.com / Admin123!');
  console.log('   Operator: operator@adeo.com / Operator123!');
  console.log('\n📊 Service Referential Data:');
  console.log(`   Countries: 4 (ES, FR, IT, PL)`);
  console.log(`   Provinces: 2 sample (Madrid, Paris)`);
  console.log(`   Cities: 2 sample (Madrid, Paris)`);
  console.log(`   Postal Codes: 6 sample`);
  console.log(`   Provider Specialties: ${specialties.length}`);
  console.log(`   Contract Templates: ${contractTemplates.length}`);
  console.log(`   Sample Services: ${sampleServices.length}`);
  console.log(`   Calendar Configs: ${calendarConfigs.length} (PRD BR-5 compliant)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
