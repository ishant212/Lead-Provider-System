const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Services
  const servicesData = [
    { name: 'Service 1' },
    { name: 'Service 2' },
    { name: 'Service 3' },
  ];

  for (const service of servicesData) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {},
      create: service,
    });
  }

  // Create Providers
  const providersData = Array.from({ length: 8 }, (_, i) => ({
    name: `Provider ${i + 1}`,
    quotaRemaining: 10,
  }));

  for (const provider of providersData) {
    await prisma.provider.upsert({
      where: { name: provider.name },
      update: {}, // Don't reset quota if they already exist, or do we? Let's just ensure they exist.
      create: provider,
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
