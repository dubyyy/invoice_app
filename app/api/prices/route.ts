import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const prices = await prisma.price.findMany({
      orderBy: {
        lastUpdated: 'desc',
      },
    });
    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemName, category, unitPrice, vehicleModel, vehicleYear } = body;
    
    if (!itemName || !category || typeof unitPrice !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const price = await prisma.price.create({
      data: {
        itemName,
        category,
        unitPrice,
        vehicleModel: vehicleModel || null,
        vehicleYear: vehicleYear || null,
      },
    });

    return NextResponse.json(price, { status: 201 });
  } catch (error) {
    console.error('Error creating price:', error);
    return NextResponse.json({ error: 'Failed to create price' }, { status: 500 });
  }
}
