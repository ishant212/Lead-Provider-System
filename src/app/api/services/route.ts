import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: { id: 'asc' }
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error('Failed to fetch services:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
