import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      invoiceDate,
      dueDate,
      rcNo,
      tin,
      quoteNumber,
      vehicleModel,
      vehicleYear,
      regNumber,
      validity,
      paymentTerms,
      salesRep,
      driverNumber,
      branch,
      unit,
      taxRate,
      items,
    } = body;

    if (!customerName || !invoiceDate || !dueDate || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        customerName,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        rcNo: rcNo || '',
        tin: tin || '',
        quoteNumber: quoteNumber || '',
        vehicleModel: vehicleModel || '',
        vehicleYear: vehicleYear || '',
        regNumber: regNumber || '',
        validity: validity || '',
        paymentTerms: paymentTerms || '',
        salesRep: salesRep || '',
        driverNumber: driverNumber || '',
        branch: branch || '',
        unit: unit || '',
        taxRate: parseFloat(taxRate) || 0,
        items,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
