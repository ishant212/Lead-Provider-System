import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        _count: {
          select: { assignedLeads: true }
        },
        assignedLeads: {
          include: {
            lead: {
              include: {
                service: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    return NextResponse.json(providers);
  } catch (error) {
    console.error('Failed to fetch providers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
