import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding calendar configurations...');

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
    const result = await prisma.calendarConfig.upsert({
      where: {
        countryCode_businessUnit: {
          countryCode: config.countryCode,
          businessUnit: config.businessUnit,
        },
      },
      update: config,
      create: config,
    });
    console.log(`✅ Upserted calendar config: ${result.countryCode}/${result.businessUnit}`);
  }

  console.log(`\n✨ Seeded ${calendarConfigs.length} calendar configurations (PRD BR-5 compliant)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
