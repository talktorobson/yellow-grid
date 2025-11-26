import { PrismaClient, ServiceCategory, ContractProvider, RateType, ExperienceLevel, ServiceType, ServiceStatus, ProviderStatus, BookingType, AssignmentState, AssignmentMode, ServicePriority, ServiceOrderState, BookingStatus } from '@prisma/client';
// @ts-ignore
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
    { code: 'PT', name: 'Portugal', timezone: 'Europe/Lisbon', currency: 'EUR', locale: 'pt-PT' },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: country,
    });
  }
  console.log('✅ Created 5 countries');

  // Sample provinces
  // Spain
  const madridProvince = await prisma.province.upsert({
    where: { countryCode_code: { countryCode: 'ES', code: '28' } },
    update: {},
    create: { countryCode: 'ES', code: '28', name: 'Madrid' },
  });
  const barcelonaProvince = await prisma.province.upsert({
    where: { countryCode_code: { countryCode: 'ES', code: '08' } },
    update: {},
    create: { countryCode: 'ES', code: '08', name: 'Barcelona' },
  });
  const valenciaProvince = await prisma.province.upsert({
    where: { countryCode_code: { countryCode: 'ES', code: '46' } },
    update: {},
    create: { countryCode: 'ES', code: '46', name: 'Valencia' },
  });

  // France
  const parisProvince = await prisma.province.upsert({
    where: { countryCode_code: { countryCode: 'FR', code: '75' } },
    update: {},
    create: { countryCode: 'FR', code: '75', name: 'Paris' },
  });

  // Italy
  const milanProvince = await prisma.province.upsert({
    where: { countryCode_code: { countryCode: 'IT', code: 'MI' } },
    update: {},
    create: { countryCode: 'IT', code: 'MI', name: 'Milan' },
  });
  const romeProvince = await prisma.province.upsert({
    where: { countryCode_code: { countryCode: 'IT', code: 'RM' } },
    update: {},
    create: { countryCode: 'IT', code: 'RM', name: 'Rome' },
  });

  // Portugal
  const lisbonProvince = await prisma.province.upsert({
    where: { countryCode_code: { countryCode: 'PT', code: '11' } },
    update: {},
    create: { countryCode: 'PT', code: '11', name: 'Lisbon' },
  });
  const portoProvince = await prisma.province.upsert({
    where: { countryCode_code: { countryCode: 'PT', code: '13' } },
    update: {},
    create: { countryCode: 'PT', code: '13', name: 'Porto' },
  });

  console.log('✅ Created sample provinces');

  // Sample cities
  // Spain
  const madridCity = await prisma.city.upsert({
    where: { provinceId_code: { provinceId: madridProvince.id, code: 'MAD' } },
    update: {},
    create: { provinceId: madridProvince.id, code: 'MAD', name: 'Madrid' },
  });
  const barcelonaCity = await prisma.city.upsert({
    where: { provinceId_code: { provinceId: barcelonaProvince.id, code: 'BCN' } },
    update: {},
    create: { provinceId: barcelonaProvince.id, code: 'BCN', name: 'Barcelona' },
  });
  const valenciaCity = await prisma.city.upsert({
    where: { provinceId_code: { provinceId: valenciaProvince.id, code: 'VLC' } },
    update: {},
    create: { provinceId: valenciaProvince.id, code: 'VLC', name: 'Valencia' },
  });

  // France
  const parisCity = await prisma.city.upsert({
    where: { provinceId_code: { provinceId: parisProvince.id, code: 'PAR' } },
    update: {},
    create: { provinceId: parisProvince.id, code: 'PAR', name: 'Paris' },
  });

  // Italy
  const milanCity = await prisma.city.upsert({
    where: { provinceId_code: { provinceId: milanProvince.id, code: 'MIL' } },
    update: {},
    create: { provinceId: milanProvince.id, code: 'MIL', name: 'Milan' },
  });
  const romeCity = await prisma.city.upsert({
    where: { provinceId_code: { provinceId: romeProvince.id, code: 'ROM' } },
    update: {},
    create: { provinceId: romeProvince.id, code: 'ROM', name: 'Rome' },
  });

  // Portugal
  const lisbonCity = await prisma.city.upsert({
    where: { provinceId_code: { provinceId: lisbonProvince.id, code: 'LIS' } },
    update: {},
    create: { provinceId: lisbonProvince.id, code: 'LIS', name: 'Lisbon' },
  });
  const portoCity = await prisma.city.upsert({
    where: { provinceId_code: { provinceId: portoProvince.id, code: 'OPO' } },
    update: {},
    create: { provinceId: portoProvince.id, code: 'OPO', name: 'Porto' },
  });

  console.log('✅ Created sample cities');

  // Sample postal codes
  const samplePostalCodes = [
    { cityId: madridCity.id, code: '28001' },
    { cityId: madridCity.id, code: '28002' },
    { cityId: madridCity.id, code: '28003' },
    { cityId: barcelonaCity.id, code: '08001' },
    { cityId: valenciaCity.id, code: '46001' },
    { cityId: parisCity.id, code: '75001' },
    { cityId: parisCity.id, code: '75002' },
    { cityId: parisCity.id, code: '75003' },
    { cityId: milanCity.id, code: '20121' },
    { cityId: romeCity.id, code: '00118' },
    { cityId: lisbonCity.id, code: '1000-001' },
    { cityId: portoCity.id, code: '4000-001' },
  ];

  for (const postalCode of samplePostalCodes) {
    await prisma.postalCode.upsert({
      where: { cityId_code: { cityId: postalCode.cityId, code: postalCode.code } },
      update: {},
      create: postalCode,
    });
  }

  console.log('✅ Created sample postal codes');


  // ============================================================================
  // 5. SEED PROVIDER SPECIALTIES
  // ============================================================================
  console.log('\n🔧 Seeding provider specialties...');

  const specialties = [
    // HVAC Specialties
    { code: 'HVAC_INSTALL', name: 'HVAC Installation', category: ServiceCategory.HVAC, requiresCertification: true, certificationAuthority: 'Spanish HVAC Association' },
    { code: 'HVAC_REPAIR', name: 'HVAC Repair & Maintenance', category: ServiceCategory.HVAC, requiresCertification: true, certificationAuthority: 'Spanish HVAC Association' },
    { code: 'AC_INSTALL', name: 'Air Conditioning Installation', category: ServiceCategory.HVAC, requiresCertification: true, certificationAuthority: 'Spanish HVAC Association' },

    // Plumbing Specialties
    { code: 'PLUMB_INSTALL', name: 'Plumbing Installation', category: ServiceCategory.PLUMBING, requiresCertification: true, certificationAuthority: 'National Plumbing Certification' },
    { code: 'PLUMB_REPAIR', name: 'Plumbing Repair', category: ServiceCategory.PLUMBING, requiresCertification: false, certificationAuthority: null },
    { code: 'WATER_HEATER', name: 'Water Heater Installation', category: ServiceCategory.PLUMBING, requiresCertification: true, certificationAuthority: 'National Plumbing Certification' },

    // Electrical Specialties
    { code: 'ELEC_INSTALL', name: 'Electrical Installation', category: ServiceCategory.ELECTRICAL, requiresCertification: true, certificationAuthority: 'National Electrical Certification' },
    { code: 'ELEC_REPAIR', name: 'Electrical Repair', category: ServiceCategory.ELECTRICAL, requiresCertification: true, certificationAuthority: 'National Electrical Certification' },

    // Kitchen Specialties
    { code: 'KITCHEN_FULL', name: 'Full Kitchen Installation', category: ServiceCategory.KITCHEN, requiresCertification: false, certificationAuthority: null },
    { code: 'APPLIANCE_INSTALL', name: 'Kitchen Appliance Installation', category: ServiceCategory.KITCHEN, requiresCertification: false, certificationAuthority: null },

    // Bathroom Specialties
    { code: 'BATHROOM_FULL', name: 'Full Bathroom Installation', category: ServiceCategory.BATHROOM, requiresCertification: false, certificationAuthority: null },
    { code: 'SHOWER_INSTALL', name: 'Shower Installation', category: ServiceCategory.BATHROOM, requiresCertification: false, certificationAuthority: null },

    // Flooring Specialties
    { code: 'FLOOR_TILE', name: 'Tile Flooring Installation', category: ServiceCategory.FLOORING, requiresCertification: false, certificationAuthority: null },
    { code: 'FLOOR_WOOD', name: 'Wood Flooring Installation', category: ServiceCategory.FLOORING, requiresCertification: false, certificationAuthority: null },

    // Windows & Doors
    { code: 'WINDOW_INSTALL', name: 'Window Installation', category: ServiceCategory.WINDOWS_DOORS, requiresCertification: false, certificationAuthority: null },
    { code: 'DOOR_INSTALL', name: 'Door Installation', category: ServiceCategory.WINDOWS_DOORS, requiresCertification: false, certificationAuthority: null },

    // Garden
    { code: 'GARDEN_INSTALL', name: 'Garden Installation', category: ServiceCategory.GARDEN, requiresCertification: false, certificationAuthority: null },

    // Furniture
    { code: 'FURNITURE_ASSEMBLY', name: 'Furniture Assembly', category: ServiceCategory.FURNITURE, requiresCertification: false, certificationAuthority: null },
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
      provider: ContractProvider.ADOBE_SIGN,
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
      provider: ContractProvider.ADOBE_SIGN,
      version: 1,
      isActive: true,
    },
    {
      code: 'TV_QUOTATION_V1',
      name: 'Technical Visit Quotation Contract',
      description: 'Contract for quotation technical visits',
      countryCode: 'ES',
      businessUnit: null,
      externalTemplateId: 'ADOBE_ES_INSTALL_001',
      provider: ContractProvider.ADOBE_SIGN,
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
      provider: ContractProvider.ADOBE_SIGN,
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
      businessUnit: 'LEROY_MERLIN',
      serviceType: ServiceType.INSTALLATION,
      serviceCategory: ServiceCategory.HVAC,
      name: 'Air Conditioning Installation - Standard',
      description: 'Standard air conditioning unit installation (up to 3.5kW)',
      scopeIncluded: ['Remove old unit (if any)', 'Install new unit', 'Connect to electrical outlet', 'Test functionality'],
      scopeExcluded: ['Electrical wiring modifications', 'Wall modifications', 'Outdoor unit bracket installation'],
      worksiteRequirements: ['Electrical outlet within 2m', 'Clear access to installation location', 'Outdoor unit mounting location prepared'],
      productPrerequisites: ['AC unit pre-delivered', 'Installation kit included'],
      estimatedDurationMinutes: 180,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      contractTemplateId: hvacInstallTemplate?.id || null,
      status: ServiceStatus.ACTIVE,
      syncChecksum: 'abc123def456',
      lastSyncedAt: new Date(),
      createdBy: 'SEED_SCRIPT',
    },
    {
      externalServiceCode: 'PYX_ES_PLUMB_001',
      fsmServiceCode: 'SVC_ES_PLUMB_001',
      externalSource: 'PYXIS',
      countryCode: 'ES',
      businessUnit: 'LEROY_MERLIN',
      serviceType: ServiceType.INSTALLATION,
      serviceCategory: ServiceCategory.PLUMBING,
      name: 'Water Heater Installation',
      description: 'Electric water heater installation (50-100L capacity)',
      scopeIncluded: ['Remove old water heater', 'Install new water heater', 'Connect plumbing', 'Connect electrical', 'Test for leaks'],
      scopeExcluded: ['Pipe modifications beyond 1m', 'Electrical circuit installation'],
      worksiteRequirements: ['Water supply accessible', 'Electrical connection available', 'Mounting location prepared'],
      productPrerequisites: ['Water heater pre-delivered', 'Installation materials included'],
      estimatedDurationMinutes: 240,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      contractTemplateId: hvacInstallTemplate?.id || null,
      status: ServiceStatus.ACTIVE,
      syncChecksum: 'def456ghi789',
      lastSyncedAt: new Date(),
      createdBy: 'SEED_SCRIPT',
    },
    {
      externalServiceCode: 'PYX_ES_KITCHEN_001',
      fsmServiceCode: 'SVC_ES_KITCHEN_001',
      externalSource: 'PYXIS',
      countryCode: 'ES',
      businessUnit: 'LEROY_MERLIN',
      serviceType: ServiceType.INSTALLATION,
      serviceCategory: ServiceCategory.KITCHEN,
      name: 'Full Kitchen Installation',
      description: 'Complete kitchen installation including cabinets, countertop, sink, and appliances',
      scopeIncluded: ['Cabinet assembly and installation', 'Countertop installation', 'Sink and faucet installation', 'Appliance installation (oven, dishwasher, hood)', 'Final adjustments and cleanup'],
      scopeExcluded: ['Plumbing line modifications', 'Electrical wiring beyond connecting appliances', 'Wall/floor tile work'],
      worksiteRequirements: ['Kitchen space cleared and prepared', 'Plumbing and electrical connections ready', 'Floor level'],
      productPrerequisites: ['All kitchen components pre-delivered', 'Assembly instructions available'],
      estimatedDurationMinutes: 960, // 2 days
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      contractTemplateId: hvacInstallTemplate?.id || null,
      status: ServiceStatus.ACTIVE,
      syncChecksum: 'ghi789jkl012',
      lastSyncedAt: new Date(),
      createdBy: 'SEED_SCRIPT',
    },
    // Italy Services
    {
      externalServiceCode: 'PYX_IT_HVAC_001',
      fsmServiceCode: 'SVC_IT_HVAC_001',
      externalSource: 'PYXIS',
      countryCode: 'IT',
      businessUnit: 'LEROY_MERLIN',
      serviceType: ServiceType.INSTALLATION,
      serviceCategory: ServiceCategory.HVAC,
      name: 'Installazione Aria Condizionata - Standard',
      description: 'Installazione standard condizionatore (fino a 3.5kW)',
      scopeIncluded: ['Rimozione vecchia unità', 'Installazione nuova unità', 'Collegamento elettrico', 'Test funzionalità'],
      scopeExcluded: ['Modifiche impianto elettrico', 'Opere murarie', 'Installazione staffa esterna'],
      worksiteRequirements: ['Presa elettrica entro 2m', 'Accesso libero', 'Predisposizione unità esterna'],
      productPrerequisites: ['Unità consegnata', 'Kit installazione incluso'],
      estimatedDurationMinutes: 180,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      contractTemplateId: null,
      status: ServiceStatus.ACTIVE,
      syncChecksum: 'it_hvac_123',
      lastSyncedAt: new Date(),
      createdBy: 'SEED_SCRIPT',
    },
    {
      externalServiceCode: 'PYX_IT_PLUMB_001',
      fsmServiceCode: 'SVC_IT_PLUMB_001',
      externalSource: 'PYXIS',
      countryCode: 'IT',
      businessUnit: 'LEROY_MERLIN',
      serviceType: ServiceType.INSTALLATION,
      serviceCategory: ServiceCategory.PLUMBING,
      name: 'Installazione Scaldabagno',
      description: 'Installazione scaldabagno elettrico (50-100L)',
      scopeIncluded: ['Rimozione vecchio scaldabagno', 'Installazione nuovo', 'Allacciamenti idraulici', 'Allacciamento elettrico'],
      scopeExcluded: ['Modifiche tubazioni oltre 1m', 'Nuovo punto luce'],
      worksiteRequirements: ['Attacchi acqua presenti', 'Presa elettrica presente'],
      productPrerequisites: ['Scaldabagno consegnato'],
      estimatedDurationMinutes: 240,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      contractTemplateId: null,
      status: ServiceStatus.ACTIVE,
      syncChecksum: 'it_plumb_123',
      lastSyncedAt: new Date(),
      createdBy: 'SEED_SCRIPT',
    },
    // Portugal Services
    {
      externalServiceCode: 'PYX_PT_HVAC_001',
      fsmServiceCode: 'SVC_PT_HVAC_001',
      externalSource: 'PYXIS',
      countryCode: 'PT',
      businessUnit: 'LEROY_MERLIN',
      serviceType: ServiceType.INSTALLATION,
      serviceCategory: ServiceCategory.HVAC,
      name: 'Instalação Ar Condicionado - Standard',
      description: 'Instalação standard ar condicionado (até 3.5kW)',
      scopeIncluded: ['Remoção unidade antiga', 'Instalação nova unidade', 'Ligação elétrica', 'Teste funcionamento'],
      scopeExcluded: ['Alterações elétricas', 'Trabalhos de alvenaria', 'Instalação suporte exterior'],
      worksiteRequirements: ['Tomada elétrica a 2m', 'Acesso livre', 'Local unidade exterior preparado'],
      productPrerequisites: ['Unidade entregue', 'Kit instalação incluído'],
      estimatedDurationMinutes: 180,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      contractTemplateId: null,
      status: ServiceStatus.ACTIVE,
      syncChecksum: 'pt_hvac_123',
      lastSyncedAt: new Date(),
      createdBy: 'SEED_SCRIPT',
    },
    {
      externalServiceCode: 'PYX_PT_PLUMB_001',
      fsmServiceCode: 'SVC_PT_PLUMB_001',
      externalSource: 'PYXIS',
      countryCode: 'PT',
      businessUnit: 'LEROY_MERLIN',
      serviceType: ServiceType.INSTALLATION,
      serviceCategory: ServiceCategory.PLUMBING,
      name: 'Instalação Termoacumulador',
      description: 'Instalação termoacumulador elétrico (50-100L)',
      scopeIncluded: ['Remoção antigo', 'Instalação novo', 'Ligações água', 'Ligação elétrica'],
      scopeExcluded: ['Alteração canalização > 1m', 'Novo ponto elétrico'],
      worksiteRequirements: ['Pontos água acessíveis', 'Ponto luz acessível'],
      productPrerequisites: ['Termoacumulador entregue'],
      estimatedDurationMinutes: 240,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      contractTemplateId: null,
      status: ServiceStatus.ACTIVE,
      syncChecksum: 'pt_plumb_123',
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

  // Fetch new services
  const itHvacService = await prisma.serviceCatalog.findUnique({ where: { externalServiceCode: 'PYX_IT_HVAC_001' } });
  const itPlumbingService = await prisma.serviceCatalog.findUnique({ where: { externalServiceCode: 'PYX_IT_PLUMB_001' } });
  const ptHvacService = await prisma.serviceCatalog.findUnique({ where: { externalServiceCode: 'PYX_PT_HVAC_001' } });
  const ptPlumbingService = await prisma.serviceCatalog.findUnique({ where: { externalServiceCode: 'PYX_PT_PLUMB_001' } });

  const madridPostalCode = await prisma.postalCode.findUnique({
    where: { cityId_code: { cityId: madridCity.id, code: '28001' } },
  });

  const milanPostalCode = await prisma.postalCode.findUnique({
    where: { cityId_code: { cityId: milanCity.id, code: '20121' } },
  });

  const lisbonPostalCode = await prisma.postalCode.findUnique({
    where: { cityId_code: { cityId: lisbonCity.id, code: '1000-001' } },
  });

  const pricingData = [
    // HVAC pricing - Country default (ES)
    {
      serviceId: hvacService?.id!,
      countryCode: 'ES',
      businessUnit: 'LEROY_MERLIN',
      postalCodeId: null, // Country default
      baseRate: 150.00,
      currency: 'EUR',
      rateType: RateType.FIXED,
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    // HVAC pricing - Madrid premium
    {
      serviceId: hvacService?.id!,
      countryCode: 'ES',
      businessUnit: 'LEROY_MERLIN',
      postalCodeId: madridPostalCode?.id!,
      baseRate: 175.00, // 16% higher in Madrid
      currency: 'EUR',
      rateType: RateType.FIXED,
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    // Plumbing pricing - Country default
    {
      serviceId: plumbingService?.id!,
      countryCode: 'ES',
      businessUnit: 'LEROY_MERLIN',
      postalCodeId: null,
      baseRate: 200.00,
      currency: 'EUR',
      rateType: RateType.FIXED,
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    // Kitchen pricing - Country default
    {
      serviceId: kitchenService?.id!,
      countryCode: 'ES',
      businessUnit: 'LEROY_MERLIN',
      postalCodeId: null,
      baseRate: 1200.00,
      currency: 'EUR',
      rateType: RateType.FIXED,
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    // IT Pricing
    {
      serviceId: itHvacService?.id!,
      countryCode: 'IT',
      businessUnit: 'LEROY_MERLIN',
      postalCodeId: null,
      baseRate: 160.00,
      currency: 'EUR',
      rateType: RateType.FIXED,
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    {
      serviceId: itHvacService?.id!,
      countryCode: 'IT',
      businessUnit: 'LEROY_MERLIN',
      postalCodeId: milanPostalCode?.id!,
      baseRate: 190.00,
      currency: 'EUR',
      rateType: RateType.FIXED,
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    {
      serviceId: itPlumbingService?.id!,
      countryCode: 'IT',
      businessUnit: 'LEROY_MERLIN',
      postalCodeId: null,
      baseRate: 210.00,
      currency: 'EUR',
      rateType: RateType.FIXED,
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    // PT Pricing
    {
      serviceId: ptHvacService?.id!,
      countryCode: 'PT',
      businessUnit: 'LEROY_MERLIN',
      postalCodeId: null,
      baseRate: 130.00,
      currency: 'EUR',
      rateType: RateType.FIXED,
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    {
      serviceId: ptHvacService?.id!,
      countryCode: 'PT',
      businessUnit: 'LEROY_MERLIN',
      postalCodeId: lisbonPostalCode?.id!,
      baseRate: 150.00,
      currency: 'EUR',
      rateType: RateType.FIXED,
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
    {
      serviceId: ptPlumbingService?.id!,
      countryCode: 'PT',
      businessUnit: 'LEROY_MERLIN',
      postalCodeId: null,
      baseRate: 180.00,
      currency: 'EUR',
      rateType: RateType.FIXED,
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      createdBy: 'SEED_SCRIPT',
    },
  ];

  for (const pricing of pricingData) {
    if (pricing.serviceId) {
      try {
        await prisma.servicePricing.create({
          data: pricing,
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          // Ignore unique constraint violations (already exists)
        } else {
          throw e;
        }
      }
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
      minimumExperience: ExperienceLevel.INTERMEDIATE,
    },
    // Plumbing service requires plumbing and water heater specialties
    {
      serviceId: plumbingService?.id!,
      specialtyId: plumbInstallSpecialty?.id!,
      isRequired: true,
      minimumExperience: ExperienceLevel.INTERMEDIATE,
    },
    {
      serviceId: plumbingService?.id!,
      specialtyId: waterHeaterSpecialty?.id!,
      isRequired: true,
      minimumExperience: ExperienceLevel.INTERMEDIATE,
    },
    // Kitchen service requires kitchen specialty
    {
      serviceId: kitchenService?.id!,
      specialtyId: kitchenSpecialty?.id!,
      isRequired: true,
      minimumExperience: ExperienceLevel.SENIOR,
    },
    // IT HVAC
    {
      serviceId: itHvacService?.id!,
      specialtyId: hvacInstallSpecialty?.id!,
      isRequired: true,
      minimumExperience: ExperienceLevel.INTERMEDIATE,
    },
    // IT Plumbing
    {
      serviceId: itPlumbingService?.id!,
      specialtyId: plumbInstallSpecialty?.id!,
      isRequired: true,
      minimumExperience: ExperienceLevel.INTERMEDIATE,
    },
    // PT HVAC
    {
      serviceId: ptHvacService?.id!,
      specialtyId: hvacInstallSpecialty?.id!,
      isRequired: true,
      minimumExperience: ExperienceLevel.INTERMEDIATE,
    },
    // PT Plumbing
    {
      serviceId: ptPlumbingService?.id!,
      specialtyId: plumbInstallSpecialty?.id!,
      isRequired: true,
      minimumExperience: ExperienceLevel.INTERMEDIATE,
    },
  ];

  for (const requirement of skillRequirements) {
    if (requirement.serviceId && requirement.specialtyId) {
      try {
        await prisma.serviceSkillRequirement.create({
          data: requirement,
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          // Ignore unique constraint violations
        } else {
          throw e;
        }
      }
    }
  }

  console.log(`✅ Created ${skillRequirements.length} service skill requirements`);

  // ============================================================================
  // 8. SEED PROVIDERS
  // ============================================================================
  console.log('\n👷 Seeding providers...');

  const providers = [
    {
      externalId: 'PROV_FR_001',
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
      name: 'Paris Installers SARL',
      legalName: 'Paris Installers SARL',
      taxId: 'FR123456789',
      email: 'contact@paris-installers.fr',
      phone: '+33123456789',
      status: ProviderStatus.ACTIVE,
      address: {
        street: '123 Rue de Paris',
        city: 'Paris',
        postalCode: '75001',
        country: 'FR',
      },
    },
    {
      externalId: 'PROV_FR_002',
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
      name: 'FastFix France',
      legalName: 'FastFix France SAS',
      taxId: 'FR987654321',
      email: 'support@fastfix.fr',
      phone: '+33987654321',
      status: ProviderStatus.ACTIVE,
      address: {
        street: '456 Avenue de Lyon',
        city: 'Lyon',
        postalCode: '69001',
        country: 'FR',
      },
    },
    {
      externalId: 'PROV_ES_001',
      countryCode: 'ES',
      businessUnit: 'LEROY_MERLIN',
      name: 'Madrid Servicios SL',
      legalName: 'Madrid Servicios SL',
      taxId: 'ESB12345678',
      email: 'info@madrid-servicios.es',
      phone: '+34912345678',
      status: ProviderStatus.ACTIVE,
      address: {
        street: 'Calle Mayor 1',
        city: 'Madrid',
        postalCode: '28001',
        country: 'ES',
      },
    },
    // Spain (Additional)
    {
      externalId: 'PROV_ES_002',
      countryCode: 'ES',
      businessUnit: 'LEROY_MERLIN',
      name: 'Barcelona Installs SL',
      legalName: 'Barcelona Installs SL',
      taxId: 'ESB87654321',
      email: 'info@bcn-installs.es',
      phone: '+34931234567',
      status: ProviderStatus.ACTIVE,
      address: { street: 'La Rambla 100', city: 'Barcelona', postalCode: '08001', country: 'ES' },
    },
    // Italy
    {
      externalId: 'PROV_IT_001',
      countryCode: 'IT',
      businessUnit: 'LEROY_MERLIN',
      name: 'Milano Servizi SRL',
      legalName: 'Milano Servizi SRL',
      taxId: 'IT12345678901',
      email: 'contact@milano-servizi.it',
      phone: '+390212345678',
      status: ProviderStatus.ACTIVE,
      address: { street: 'Via Dante 1', city: 'Milan', postalCode: '20121', country: 'IT' },
    },
    {
      externalId: 'PROV_IT_002',
      countryCode: 'IT',
      businessUnit: 'LEROY_MERLIN',
      name: 'Roma Fix SRL',
      legalName: 'Roma Fix SRL',
      taxId: 'IT98765432109',
      email: 'info@romafix.it',
      phone: '+390612345678',
      status: ProviderStatus.ACTIVE,
      address: { street: 'Via del Corso 10', city: 'Rome', postalCode: '00118', country: 'IT' },
    },
    // Portugal
    {
      externalId: 'PROV_PT_001',
      countryCode: 'PT',
      businessUnit: 'LEROY_MERLIN',
      name: 'Lisboa Montagens Lda',
      legalName: 'Lisboa Montagens Lda',
      taxId: 'PT123456789',
      email: 'geral@lisboa-montagens.pt',
      phone: '+351211234567',
      status: ProviderStatus.ACTIVE,
      address: { street: 'Av. da Liberdade 1', city: 'Lisbon', postalCode: '1000-001', country: 'PT' },
    },
  ];

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { externalId: provider.externalId },
      update: provider,
      create: provider,
    });
  }

  console.log(`✅ Created ${providers.length} providers`);

  // ============================================================================
  // 9. SEED CALENDAR CONFIGS (PRD BR-5 Compliant Buffer Settings)
  // ============================================================================
  console.log('\n📅 Seeding calendar configurations...');

  const calendarConfigs = [
    // Spain - Leroy Merlin
    {
      countryCode: 'ES',
      businessUnit: 'LEROY_MERLIN',
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
      businessUnit: 'BRICO_DEPOT',
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
      businessUnit: 'LEROY_MERLIN',
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
      businessUnit: 'BRICO_DEPOT',
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
      businessUnit: 'LEROY_MERLIN',
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
      businessUnit: 'LEROY_MERLIN',
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
    // Portugal - Leroy Merlin
    {
      countryCode: 'PT',
      businessUnit: 'LEROY_MERLIN',
      workingDays: [1, 2, 3, 4, 5],
      timezone: 'Europe/Lisbon',
      morningShiftStart: '09:00',
      morningShiftEnd: '13:00',
      afternoonShiftStart: '14:00',
      afternoonShiftEnd: '18:00',
      eveningShiftStart: null,
      eveningShiftEnd: null,
      globalBufferNonWorkingDays: 2,
      staticBufferNonWorkingDays: 1,
      travelBufferMinutes: 30,
      crossDayAllowed: false,
      holidayRegion: 'PT',
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

  // ============================================================================
  // 10. SEED WORK TEAMS & TRANSACTIONAL DATA (Calendar/Heatmap)
  // ============================================================================
  console.log('\n👷 Seeding work teams and transactional data...');

  // Fetch providers to link
  const allProviders = await prisma.provider.findMany();
  
  // Create Work Teams for each provider
  const workTeams = [];
  for (const provider of allProviders) {
    let team = await prisma.workTeam.findFirst({
      where: { 
        providerId: provider.id,
        name: `${provider.name} - Team A`
      }
    });

    if (!team) {
      team = await prisma.workTeam.create({
        data: {
          providerId: provider.id,
          countryCode: provider.countryCode,
          name: `${provider.name} - Team A`,
          maxDailyJobs: 5,
          skills: ["installation", "repair"],
          serviceTypes: ["P1", "P2"],
          postalCodes: ["28001", "08001", "20121", "00118", "1000-001"],
          workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
          shifts: [{code:"M", startLocal:"08:00", endLocal:"18:00"}]
        }
      });
    }
    workTeams.push(team);
  }
  console.log(`✅ Created/Verified ${workTeams.length} work teams`);

  // Create Service Orders & Bookings for Heatmap/Calendar
  // We'll create orders around the major cities we seeded
  const locations = [
    { city: 'Madrid', lat: 40.4168, lon: -3.7038, country: 'ES', province: '28' },
    { city: 'Barcelona', lat: 41.3851, lon: 2.1734, country: 'ES', province: '08' },
    { city: 'Milan', lat: 45.4642, lon: 9.1900, country: 'IT', province: 'MI' },
    { city: 'Rome', lat: 41.9028, lon: 12.4964, country: 'IT', province: 'RM' },
    { city: 'Lisbon', lat: 38.7223, lon: -9.1393, country: 'PT', province: '11' },
  ];

  // Get a service to use
  const service = await prisma.serviceCatalog.findFirst();
  if (!service) {
    console.warn('⚠️ No services found, skipping transactional data seeding');
  } else {
    let orderCount = 0;
    let bookingCount = 0;

    const today = new Date();
    
    for (const loc of locations) {
      // Find a provider in this country
      const localProvider = allProviders.find(p => p.countryCode === loc.country);
      const localTeam = workTeams.find(t => t.providerId === localProvider?.id);

      // Create 5 orders per location
      for (let i = 0; i < 5; i++) {
        // Jitter location slightly for heatmap
        const lat = loc.lat + (Math.random() - 0.5) * 0.1;
        const lon = loc.lon + (Math.random() - 0.5) * 0.1;
        
        const status = i < 3 ? ServiceOrderState.ASSIGNED : ServiceOrderState.CREATED;
        
        const order = await prisma.serviceOrder.create({
          data: {
            externalServiceOrderId: `ORD-${loc.country}-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
            serviceId: service.id,
            state: status,
            serviceType: service.serviceType,
            priority: ServicePriority.P2,
            estimatedDurationMinutes: 120,
            countryCode: loc.country,
            businessUnit: 'LEROY_MERLIN',
            customerInfo: {
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+1234567890',
              address: {
                street: 'Main St',
                city: loc.city,
                postalCode: '12345',
                country: loc.country
              }
            },
            serviceAddress: {
              street: 'Main St',
              city: loc.city,
              postalCode: '12345',
              country: loc.country,
              lat: lat,
              lng: lon
            },
            requestedStartDate: new Date(today.getTime() + i * 24 * 60 * 60 * 1000),
            requestedEndDate: new Date(today.getTime() + (i + 7) * 24 * 60 * 60 * 1000),
          }
        });
        orderCount++;

        if (status === ServiceOrderState.ASSIGNED && localProvider && localTeam) {
          // Create Assignment
          await prisma.assignment.create({
            data: {
              serviceOrderId: order.id,
              providerId: localProvider.id,
              workTeamId: localTeam.id,
              state: AssignmentState.ACCEPTED,
              assignmentMode: AssignmentMode.DIRECT,
              assignmentMethod: 'DIRECT',
              acceptedAt: new Date(),
            }
          });

          // Create Booking for the first 2 assigned ones
          if (i < 2) {
            const bookingDate = new Date(today);
            bookingDate.setDate(today.getDate() + i + 1); // Tomorrow and day after
            
            try {
              const start = 32 + Math.floor(Math.random() * 16); // 08:00 to 12:00 start
              await prisma.booking.create({
                data: {
                  serviceOrderId: order.id,
                  providerId: localProvider.id,
                  workTeamId: localTeam.id,
                  bookingDate: bookingDate,
                  startSlot: start,
                  endSlot: start + 8,   // 2 hours
                  durationMinutes: 120,
                  bookingType: BookingType.SERVICE_ORDER,
                  status: BookingStatus.CONFIRMED,
                }
              });
              bookingCount++;
            } catch (e: any) {
              // Ignore unique constraint violation (P2002)
              if (e.code !== 'P2002') {
                console.warn('Failed to create booking:', e);
              }
            }
          }
        }
      }
    }
    
    console.log(`✅ Created ${orderCount} service orders and ${bookingCount} bookings for visualization`);
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
