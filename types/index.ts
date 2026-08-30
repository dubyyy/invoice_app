export type PriceCategory = 'Service' | 'Product';

export interface Price {
  id: string;
  itemName: string;
  category: PriceCategory;
  unitPrice: number;
  lastUpdated: string;
  vehicleModel?: string;
  vehicleYear?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  rcNo: string;
  tin: string;
  quoteNumber: string;
  vehicleModel: string;
  vehicleYear?: string;
  regNumber: string;
  validity: string;
  paymentTerms: string;
  salesRep: string;
  taxRate: number;
  items: LineItem[];
  createdAt: string;
}
