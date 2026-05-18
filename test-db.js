const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const services = await prisma.service.findMany();
    console.log("DB Connection SUCCESS. Found services:", services.length);
  } catch (e) {
    console.error("DB Connection FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
