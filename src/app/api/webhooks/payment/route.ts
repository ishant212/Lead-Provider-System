import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { providerId, idempotencyKey } = body;

    if (!providerId || !idempotencyKey) {
      return NextResponse.json({ error: 'Missing providerId or idempotencyKey' }, { status: 400 });
    }

    // Process safely with idempotency
    try {
      await prisma.$transaction(async (tx) => {
        // Attempt to record the webhook event. 
        // If idempotencyKey exists, this throws a unique constraint violation (P2002).
        await tx.webhookEvent.create({
          data: {
            idempotencyKey,
          }
        });

        // If we reach here, it's a new event. Apply the quota reset.
        await tx.provider.update({
          where: { id: parseInt(providerId) },
          data: { quotaRemaining: 10 }
        });
      });

      return NextResponse.json({ message: 'Quota reset successfully', status: 'processed' }, { status: 200 });

    } catch (txError: any) {
      // Prisma error code P2002: Unique constraint failed
      if (txError.code === 'P2002') {
        // Idempotent case: Event already processed. Return 200 OK without doing anything.
        return NextResponse.json({ message: 'Already processed', status: 'ignored' }, { status: 200 });
      }
      throw txError;
    }

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
