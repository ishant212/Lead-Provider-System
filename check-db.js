const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const providers = await prisma.provider.findMany({
    include: { _count: { select: { assignedLeads: true } } },
    orderBy: { id: 'asc' }
  });
  console.table(providers.map(p => ({
    id: p.id,
    name: p.name,
    quotaRemaining: p.quotaRemaining,
    leadsAssigned: p._count.assignedLeads
  })));
}
main().finally(() => prisma.$disconnect());
