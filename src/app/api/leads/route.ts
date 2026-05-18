import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MANDATORY_PROVIDERS = {
  'Service 1': ['Provider 1'],
  'Service 2': ['Provider 5'],
  'Service 3': ['Provider 1', 'Provider 4'],
};

const FAIR_POOLS = {
  'Service 1': ['Provider 2', 'Provider 3', 'Provider 4'],
  'Service 2': ['Provider 6', 'Provider 7', 'Provider 8'],
  'Service 3': ['Provider 2', 'Provider 3', 'Provider 5', 'Provider 6', 'Provider 7', 'Provider 8'],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, city, description, serviceId } = body;

    if (!name || !phone || !city || !serviceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const service = await prisma.service.findUnique({ where: { id: parseInt(serviceId) } });
    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    // Wrap in interactive transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Acquire GLOBAL advisory lock to serialize all lead assignments.
      // This prevents race conditions where different services share the same providers
      // and concurrently read/decrement their quotas.
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(9999)`);

      // 2. Duplicate Rule Check
      const existingLead = await tx.lead.findUnique({
        where: { phone_serviceId: { phone, serviceId: service.id } },
      });
      if (existingLead) {
        throw new Error('DUPLICATE_LEAD');
      }

      // 3. Determine target providers based on rules and quotas
      const serviceName = service.name as keyof typeof MANDATORY_PROVIDERS;
      const mandatoryNames = MANDATORY_PROVIDERS[serviceName] || [];
      const fairPoolNames = FAIR_POOLS[serviceName] || [];

      let assignedProviderIds: number[] = [];

      // Try mandatory providers first
      if (mandatoryNames.length > 0) {
        const mandatoryProviders = await tx.provider.findMany({
          where: { name: { in: mandatoryNames }, quotaRemaining: { gt: 0 } },
        });
        
        assignedProviderIds.push(...mandatoryProviders.map((p) => p.id));
      }

      // Fill remaining slots from fair pool
      const slotsNeeded = 3 - assignedProviderIds.length;
      if (slotsNeeded > 0) {
        // Query fair pool providers with quota, ordered by lastAssignedAt ascending
        // NULLS FIRST ensures providers that have never received a lead get priority
        const fairProviders = await tx.provider.findMany({
          where: { name: { in: fairPoolNames }, quotaRemaining: { gt: 0 }, id: { notIn: assignedProviderIds } },
          orderBy: { lastAssignedAt: { sort: 'asc', nulls: 'first' } },
          take: slotsNeeded,
        });
        
        assignedProviderIds.push(...fairProviders.map((p) => p.id));
      }

      // It's possible we couldn't find 3 providers if quotas are exhausted. 
      // The rules imply we should assign "Exactly 3 providers" but also "Providers cannot exceed monthly quota".
      // If system runs out of quota, we assign as many as we can (up to 3).

      // 4. Create Lead
      const newLead = await tx.lead.create({
        data: {
          name,
          phone,
          city,
          description,
          serviceId: service.id,
        },
      });

      // 5. Create Assignments & Update Quotas
      if (assignedProviderIds.length > 0) {
        // Bulk create assignments
        await tx.leadAssignment.createMany({
          data: assignedProviderIds.map((providerId) => ({
            leadId: newLead.id,
            providerId,
          })),
        });

        // Update provider stats
        await tx.provider.updateMany({
          where: { id: { in: assignedProviderIds } },
          data: {
            quotaRemaining: { decrement: 1 },
            lastAssignedAt: new Date(),
          },
        });
      }

      return { lead: newLead, assignedProviderIds };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message === 'DUPLICATE_LEAD') {
      return NextResponse.json({ error: 'Duplicate lead for this phone number and service' }, { status: 409 });
    }
    console.error('Lead creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
