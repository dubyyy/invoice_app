'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Minus,
  Trash2,
  FileText,
  PackageSearch,
  Printer,
  Sparkles,
  Upload,
  FileUp,
  X,
  Save,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { usePrices } from '@/hooks/use-prices';
import { formatCurrency, todayInput, addDaysInput, uid } from '@/lib/format';
import type { LineItem } from '@/types';

interface DraftLineItem extends LineItem { }

function emptyItem(): DraftLineItem {
  return { id: uid(), description: '', quantity: 1, unitPrice: 0 };
}

const FGC_AUTOS_TEMPLATE = {
  customerName: 'Guaranty Trust Bank\nPlot 1669, Oyin Jolayemi St,\nVictoria Island',
  invoiceDate: '2026-07-22',
  dueDate: '2026-08-22',
  rcNo: '9346106',
  tin: '2622427985709',
  quoteNumber: 'FGCAL/PFI/0028',
  vehicleModel: 'GAC GA3s',
  vehicleYear: '2016',
  regNumber: 'KTU 898 EZ',
  validity: '2 Days',
  paymentTerms: '1 Month',
  salesRep: 'ANDREW',
  driverNumber: '',
  branch: '',
  unit: '',
  taxRate: 7.5,
  items: [
    { id: 't1', description: 'SHOCK ABSORBVER COMPLET SHOCKS AND PADS', quantity: 2, unitPrice: 175000 },
    { id: 't2', description: 'STEERING RACK', quantity: 1, unitPrice: 370000 },
    { id: 't3', description: 'LOWER ARM', quantity: 2, unitPrice: 125000 },
    { id: 't4', description: 'BALL JOINT', quantity: 2, unitPrice: 30000 },
    { id: 't5', description: 'COMPLETE ROLLER', quantity: 4, unitPrice: 45000 },
    { id: 't6', description: 'FAN BELT', quantity: 1, unitPrice: 35000 },
    { id: 't7', description: 'TIE ROD', quantity: 2, unitPrice: 25000 },
    { id: 't8', description: 'STERBILZER BUSHING', quantity: 1, unitPrice: 24000 },
    { id: 't9', description: 'STERBILZER LINKAGE', quantity: 1, unitPrice: 25000 },
    { id: 't10', description: 'FRONT BRAKE PADS (GAC BRANDED)', quantity: 1, unitPrice: 35000 },
    { id: 't11', description: 'REAR BRAKE PADS', quantity: 1, unitPrice: 30000 },
  ],
};

function formatPrintDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatNaira(n: number): string {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function CreateInvoicePage() {
  const { prices } = usePrices();

  const [customerName, setCustomerName] = React.useState('');
  const [invoiceDate, setInvoiceDate] = React.useState(todayInput());
  const [dueDate, setDueDate] = React.useState(addDaysInput(30));
  const [items, setItems] = React.useState<DraftLineItem[]>([emptyItem()]);
  const [taxRate, setTaxRate] = React.useState(7.5);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [creating, setCreating] = React.useState(false);
  const [currentDraftKey, setCurrentDraftKey] = React.useState<string | null>(null);

  // Custom FGC Autos fields
  const [rcNo, setRcNo] = React.useState('9346106');
  const [tin, setTin] = React.useState('2622427985709');
  const [quoteNumber, setQuoteNumber] = React.useState('FGCAL/PFI/0028');
  const [vehicleModel, setVehicleModel] = React.useState('GAC GA3s');
  const [vehicleYear, setVehicleYear] = React.useState('2016');
  const [regNumber, setRegNumber] = React.useState('KTU 898 EZ');
  const [validity, setValidity] = React.useState('2 Days');
  const [paymentTerms, setPaymentTerms] = React.useState('1 Month');
  const [salesRep, setSalesRep] = React.useState('ANDREW');
  const [driverNumber, setDriverNumber] = React.useState('');
  const [branch, setBranch] = React.useState('');
  const [unit, setUnit] = React.useState('');

  // ---- PDF attachment / merge state ----
  const [attachedPdf, setAttachedPdf] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [merging, setMerging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const printAreaRef = React.useRef<HTMLDivElement>(null);

  const subtotal = items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const updateItem = (id: string, patch: Partial<DraftLineItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  };

  const adjustQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, quantity: Math.max(1, it.quantity + delta) }
          : it
      )
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };

  const pickPrice = (id: string, priceId: string) => {
    const price = prices.find((p) => p.id === priceId);
    if (price) {
      updateItem(id, { description: price.itemName, unitPrice: price.unitPrice });
    }
  };

  const loadFgcTemplate = () => {
    setCustomerName(FGC_AUTOS_TEMPLATE.customerName);
    setInvoiceDate(FGC_AUTOS_TEMPLATE.invoiceDate);
    setDueDate(FGC_AUTOS_TEMPLATE.dueDate);
    setRcNo(FGC_AUTOS_TEMPLATE.rcNo);
    setTin(FGC_AUTOS_TEMPLATE.tin);
    setQuoteNumber(FGC_AUTOS_TEMPLATE.quoteNumber);
    setVehicleModel(FGC_AUTOS_TEMPLATE.vehicleModel);
    setVehicleYear(FGC_AUTOS_TEMPLATE.vehicleYear);
    setRegNumber(FGC_AUTOS_TEMPLATE.regNumber);
    setValidity(FGC_AUTOS_TEMPLATE.validity);
    setPaymentTerms(FGC_AUTOS_TEMPLATE.paymentTerms);
    setSalesRep(FGC_AUTOS_TEMPLATE.salesRep);
    setDriverNumber(FGC_AUTOS_TEMPLATE.driverNumber || '');
    setBranch(FGC_AUTOS_TEMPLATE.branch || '');
    setUnit(FGC_AUTOS_TEMPLATE.unit || '');
    setTaxRate(FGC_AUTOS_TEMPLATE.taxRate);
    setItems(FGC_AUTOS_TEMPLATE.items);
    toast.success('FGC Autos template loaded!');
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!customerName.trim()) next.customerName = 'Customer details are required';
    if (!invoiceDate) next.invoiceDate = 'Invoice date is required';
    if (!dueDate) next.dueDate = 'Due date is required';
    items.forEach((it, i) => {
      if (!it.description.trim()) next[`item-${i}-desc`] = 'Description required';
      if (it.quantity <= 0) next[`item-${i}-qty`] = 'Must be at least 1';
      if (it.unitPrice < 0) next[`item-${i}-price`] = 'Cannot be negative';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveInvoiceToDb = async () => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          items: items.map((it) => ({
            id: it.id,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to save invoice');
      return await res.json();
    } catch (err) {
      console.error('Error saving invoice:', err);
      toast.error('Failed to save invoice to history');
    }
  };

  const handleCreateInvoice = async () => {
    if (!validate()) {
      toast.error('Please fix the highlighted fields before creating.');
      return;
    }
    setCreating(true);
    await saveInvoiceToDb();
    setTimeout(() => {
      setCreating(false);
      toast.success('Invoice Created!', {
        description: `Printed preview for ${customerName.split('\n')[0]}`,
      });
      window.print();
    }, 300);
  };

  // ---- Draft Save & Restore Handlers ----

  React.useEffect(() => {
    // 1. Check if we were redirected from drafts list with a specific draft to load
    const trigger = localStorage.getItem('fgc_load_draft_trigger');
    if (trigger) {
      try {
        const parsed = JSON.parse(trigger);
        setCustomerName(parsed.customerName || '');
        if (parsed.invoiceDate) setInvoiceDate(parsed.invoiceDate);
        if (parsed.dueDate) setDueDate(parsed.dueDate);
        if (parsed.items) setItems(parsed.items);
        setRcNo(parsed.rcNo || '9346106');
        setTin(parsed.tin || '2622427985709');
        setQuoteNumber(parsed.quoteNumber || '');
        setVehicleModel(parsed.vehicleModel || '');
        setVehicleYear(parsed.vehicleYear || '');
        setRegNumber(parsed.regNumber || '');
        setValidity(parsed.validity || '2 Days');
        setPaymentTerms(parsed.paymentTerms || '1 Month');
        setSalesRep(parsed.salesRep || '');
        setDriverNumber(parsed.driverNumber || '');
        setBranch(parsed.branch || '');
        setUnit(parsed.unit || '');
        setTaxRate(parsed.taxRate ?? 7.5);
        setCurrentDraftKey(parsed.localStorageKey || 'fgc_invoice_draft');
        localStorage.removeItem('fgc_load_draft_trigger');
        toast.success('Draft loaded successfully!');
        return; // Skip checking general unsaved drafts
      } catch (err) {
        console.error('Failed to parse load draft trigger:', err);
      }
    }

    // 2. Otherwise check for general unsaved drafts
    const saved = localStorage.getItem('fgc_invoice_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        toast('Unsaved draft found', {
          description: `From ${new Date(parsed.savedAt).toLocaleString()}`,
          action: {
            label: 'Restore',
            onClick: () => {
              setCustomerName(parsed.customerName || '');
              if (parsed.invoiceDate) setInvoiceDate(parsed.invoiceDate);
              if (parsed.dueDate) setDueDate(parsed.dueDate);
              if (parsed.items) setItems(parsed.items);
              setRcNo(parsed.rcNo || '9346106');
              setTin(parsed.tin || '2622427985709');
              setQuoteNumber(parsed.quoteNumber || '');
              setVehicleModel(parsed.vehicleModel || '');
              setVehicleYear(parsed.vehicleYear || '');
              setRegNumber(parsed.regNumber || '');
              setValidity(parsed.validity || '2 Days');
              setPaymentTerms(parsed.paymentTerms || '1 Month');
              setSalesRep(parsed.salesRep || '');
              setDriverNumber(parsed.driverNumber || '');
              setBranch(parsed.branch || '');
              setUnit(parsed.unit || '');
              setTaxRate(parsed.taxRate ?? 7.5);
              setCurrentDraftKey(parsed.localStorageKey || 'fgc_invoice_draft');
              if (parsed.attachedPdfName) {
                toast.info(`Please re-upload your PDF file "${parsed.attachedPdfName}" if needed.`);
              }
              toast.success('Draft restored!');
            },
          },
          cancel: {
            label: 'Dismiss',
            onClick: () => {
              localStorage.removeItem('fgc_invoice_draft');
              toast.info('Draft discarded.');
            },
          },
          duration: 10000,
        });
      } catch (err) {
        console.error('Failed to parse invoice draft:', err);
      }
    }
  }, []);

  const saveDraft = () => {
    try {
      const keyToUse = currentDraftKey || `fgc_invoice_draft_${Date.now()}`;
      const draftData = {
        localStorageKey: keyToUse,
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
        attachedPdfName: attachedPdf ? attachedPdf.name : null,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(keyToUse, JSON.stringify(draftData));
      setCurrentDraftKey(keyToUse);
      toast.success('Draft saved successfully!', {
        description: `Saved at ${new Date().toLocaleTimeString()}`,
      });
    } catch (err) {
      console.error('Failed to save draft:', err);
      toast.error('Failed to save draft to local storage.');
    }
  };

  const clearForm = () => {
    setCustomerName('');
    setInvoiceDate(todayInput());
    setDueDate(addDaysInput(30));
    setItems([emptyItem()]);
    setRcNo('9346106');
    setTin('2622427985709');
    setQuoteNumber('');
    setVehicleModel('');
    setVehicleYear('');
    setRegNumber('');
    setValidity('2 Days');
    setPaymentTerms('1 Month');
    setSalesRep('');
    setDriverNumber('');
    setBranch('');
    setUnit('');
    setTaxRate(7.5);
    setAttachedPdf(null);
    setErrors({});
    setCurrentDraftKey(null);
    toast.success('Form cleared!');
  };

  // ---- PDF attachment handlers ----

  const handleFileSelect = (file: File | null | undefined) => {
    if (!file) return;
    const looksLikePdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!looksLikePdf) {
      toast.error('Please upload a PDF file.');
      return;
    }
    setAttachedPdf(file);
    toast.success(`Attached "${file.name}"`);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // ---- Generate the invoice itself as PDF bytes, by rasterizing #print-area ----

  // A4 @ 96dpi, matching the @page + 0.45in padding used when printing
  const A4_WIDTH_PX = 793.7;
  const A4_MARGIN_PX = 43.2; // 0.45in

  const captureInvoiceCanvas = async () => {
    const node = printAreaRef.current;
    if (!node) throw new Error('Invoice preview not found.');

    const prevStyle = {
      display: node.style.display,
      position: node.style.position,
      left: node.style.left,
      top: node.style.top,
      visibility: node.style.visibility,
      zIndex: node.style.zIndex,
      width: node.style.width,
      padding: node.style.padding,
      boxSizing: node.style.boxSizing,
    };

    // Reproduce the @media print layout inline, since html2canvas renders
    // using normal screen styles and never sees the @media print rules.
    node.style.display = 'block';
    node.style.position = 'fixed';
    node.style.left = '0';
    node.style.top = '0';
    node.style.visibility = 'visible';
    node.style.zIndex = '-1';
    node.style.width = `${A4_WIDTH_PX}px`;
    node.style.padding = `${A4_MARGIN_PX}px`;
    node.style.boxSizing = 'border-box';

    // Let the browser paint before capturing.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: A4_WIDTH_PX,
      });
      return canvas;
    } finally {
      node.style.display = prevStyle.display;
      node.style.position = prevStyle.position;
      node.style.left = prevStyle.left;
      node.style.top = prevStyle.top;
      node.style.visibility = prevStyle.visibility;
      node.style.zIndex = prevStyle.zIndex;
      node.style.width = prevStyle.width;
      node.style.padding = prevStyle.padding;
      node.style.boxSizing = prevStyle.boxSizing;
    }
  };

  const generateInvoicePdfBytes = async (): Promise<Uint8Array> => {
    const canvas = await captureInvoiceCanvas();
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      // Paginate a tall invoice across multiple A4 pages.
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    return new Uint8Array(pdf.output('arraybuffer'));
  };

  // ---- Merge the generated invoice PDF with the uploaded PDF ----

  const mergeWithAttachment = async (invoiceBytes: Uint8Array): Promise<Uint8Array> => {
    const mergedPdf = await PDFDocument.create();

    const invoiceDoc = await PDFDocument.load(invoiceBytes);
    const invoicePages = await mergedPdf.copyPages(invoiceDoc, invoiceDoc.getPageIndices());
    invoicePages.forEach((page) => mergedPdf.addPage(page));
    console.log('Invoice pages:', invoicePages.length);

    if (attachedPdf) {
      let attachedBytes: Uint8Array;
      try {
        attachedBytes = new Uint8Array(await attachedPdf.arrayBuffer());
      } catch (err) {
        console.error('Could not read attached file:', err);
        toast.error('Could not read the attached PDF file.');
        throw err;
      }

      let attachedDoc: PDFDocument;
      try {
        // ignoreEncryption lets us open password/permission-restricted PDFs
        // (pages will still copy even if the source can't be edited)
        attachedDoc = await PDFDocument.load(attachedBytes, { ignoreEncryption: true });
      } catch (err) {
        console.error('Could not parse attached PDF:', err);
        toast.error('The attached file could not be read as a PDF. Try a different file.');
        throw err;
      }

      const attachedPages = await mergedPdf.copyPages(attachedDoc, attachedDoc.getPageIndices());
      console.log('Attached pages:', attachedPages.length);
      attachedPages.forEach((page) => mergedPdf.addPage(page));
    }

    console.log('Total merged pages:', mergedPdf.getPageCount());
    return mergedPdf.save();
  };

  const handleDownloadCombinedPdf = async () => {
    if (!validate()) {
      toast.error('Please fix the highlighted fields before creating.');
      return;
    }

    setMerging(true);
    try {
      await saveInvoiceToDb();
      const invoiceBytes = await generateInvoicePdfBytes();
      const mergedBytes = await mergeWithAttachment(invoiceBytes);

      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${quoteNumber || 'FGC-Autos'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(
        attachedPdf ? 'Combined PDF downloaded!' : 'Invoice PDF downloaded!'
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate the PDF. Please try again.');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.45in;
            box-sizing: border-box;
          }
          @page {
            margin: 0;
            size: portrait;
          }
        }
      ` }} />

      {/* Screen view wrapper (hidden during printing) */}
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Create Invoice
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill in the details below to create a new FGC Autos style invoice.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadFgcTemplate}
            className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 gap-1.5"
          >
            <Sparkles className="h-4 w-4" /> Load FGC Autos Template
          </Button>
        </div>

        {/* Customer & Dates */}
        <Card className="p-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="customer">Customer Name & Address</Label>
              <Textarea
                id="customer"
                placeholder="Enter customer name and address (multiline supported)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={errors.customerName ? 'border-destructive' : ''}
                rows={3}
              />
              {errors.customerName && (
                <p className="text-xs text-destructive">{errors.customerName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <DatePicker
                value={invoiceDate}
                onChange={setInvoiceDate}
                placeholder="Select invoice date"
              />
              {errors.invoiceDate && (
                <p className="text-xs text-destructive">{errors.invoiceDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select due date"
              />
              {errors.dueDate && (
                <p className="text-xs text-destructive">{errors.dueDate}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Vehicle & Quotation Details */}
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">FGC Autos Custom Details</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleModel">Vehicle Model</Label>
              <Input
                id="vehicleModel"
                placeholder="e.g. GAC GA3s"
                list="vehicle-model-list"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
              />
              <datalist id="vehicle-model-list">
                {Array.from(new Set(prices.map((p) => p.vehicleModel).filter(Boolean))).map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleYear">Vehicle Year</Label>
              <Input
                id="vehicleYear"
                placeholder="e.g. 2016"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regNumber">Reg Number</Label>
              <Input
                id="regNumber"
                placeholder="e.g. KTU 898 EZ"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validity">Validity</Label>
              <Input
                id="validity"
                placeholder="e.g. 2 Days"
                value={validity}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                placeholder="e.g. 1 Month"
                value={paymentTerms}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesRep">Sales Rep</Label>
              <Input
                id="salesRep"
                placeholder="e.g. ANDREW"
                value={salesRep}
                onChange={(e) => setSalesRep(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quoteNumber">Quote Number</Label>
              <Input
                id="quoteNumber"
                placeholder="e.g. FGCAL/PFI/0028"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rcNo">RC No</Label>
              <Input
                id="rcNo"
                placeholder="e.g. 9346106"
                value={rcNo}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tin">TIN</Label>
              <Input
                id="tin"
                placeholder="e.g. 2622427985709"
                value={tin}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driverNumber">Driver Number</Label>
              <Input
                id="driverNumber"
                placeholder="e.g. 08012345678"
                value={driverNumber}
                onChange={(e) => setDriverNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                placeholder="e.g. Lagos Branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="e.g. Unit 1"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Line Items */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Line Items</h2>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 px-2 py-3 font-medium">#</th>
                  <th className="px-2 py-3 font-medium">Item Description</th>
                  <th className="w-32 px-2 py-3 font-medium">Quantity</th>
                  <th className="w-32 px-2 py-3 font-medium">Unit Price</th>
                  <th className="w-28 px-2 py-3 text-right font-medium">Amount</th>
                  <th className="w-12 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="px-2 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1.5">
                        <Input
                          placeholder="Enter item description"
                          value={it.description}
                          onChange={(e) =>
                            updateItem(it.id, { description: e.target.value })
                          }
                          className={
                            errors[`item-${i}-desc`] ? 'border-destructive' : ''
                          }
                        />
                        <div className="flex items-center gap-2">
                          <PackageSearch className="h-3.5 w-3.5 text-muted-foreground" />
                          <select
                            className="h-7 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) pickPrice(it.id, e.target.value);
                              e.target.value = '';
                            }}
                          >
                            <option value="">Pick from price list…</option>
                            {prices
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.itemName} — {formatCurrency(p.unitPrice)} {p.vehicleModel ? `(${p.vehicleModel})` : ''}
                                </option>
                              ))}
                          </select>
                        </div>
                        {errors[`item-${i}-desc`] && (
                          <p className="text-xs text-destructive">
                            {errors[`item-${i}-desc`]}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => adjustQty(it.id, -1)}
                          className="flex h-9 w-9 items-center justify-center rounded-l-md border border-r-0 border-input bg-background hover:bg-accent"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(it.id, {
                              quantity: Math.max(1, parseInt(e.target.value) || 1),
                            })
                          }
                          className={`h-9 w-14 border-y border-input bg-background text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring ${errors[`item-${i}-qty`] ? 'border-destructive' : ''
                            }`}
                        />
                        <button
                          type="button"
                          onClick={() => adjustQty(it.id, 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-r-md border border-l-0 border-input bg-background hover:bg-accent"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          ₦
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) =>
                            updateItem(it.id, {
                              unitPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors[`item-${i}-price`] ? 'border-destructive' : ''
                            }`}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-medium text-foreground">
                      {formatCurrency(it.quantity * it.unitPrice)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        disabled={items.length === 1}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Delete row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                No items yet. Click &ldquo;Add Item&rdquo; to get started.
              </p>
            </div>
          )}
        </Card>

        {/* Totals */}
        <Card className="p-6">
          <div className="ml-auto max-w-sm space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tax</span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={taxRate}
                    disabled
                    className="h-7 w-16 rounded-md border border-input bg-muted pr-6 text-right text-xs cursor-not-allowed opacity-75"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              <span className="font-medium text-foreground">
                {formatCurrency(taxAmount)}
              </span>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">
                  Total
                </span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Attach & merge PDF */}
        <Card className="p-6">
          <h2 className="mb-1 text-base font-semibold text-foreground">
            Attach Supporting PDF
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Upload a PDF (e.g. a signed quote, ID, or supporting document) to merge it
            with the generated invoice into a single downloadable PDF.
          </p>

          {!attachedPdf ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${isDragging
                ? 'border-rose-400 bg-rose-50'
                : 'border-input hover:bg-accent/50'
                }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Drag and drop a PDF here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">PDF files only</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-input px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileUp className="h-5 w-5 shrink-0 text-rose-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {attachedPdf.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(attachedPdf.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedPdf(null)}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove attached PDF"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </Card>

        {/* Save/Print/Download Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={clearForm}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Clear Form
          </Button>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              className="gap-2 border-dashed border-rose-200 text-rose-700 hover:bg-rose-50"
              size="lg"
            >
              <Save className="h-5 w-5" />
              Save Draft
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadCombinedPdf}
              disabled={merging}
              className="gap-2"
              size="lg"
            >
              <FileUp className="h-5 w-5" />
              {merging
                ? 'Generating…'
                : attachedPdf
                  ? 'Download Combined PDF'
                  : 'Download Invoice PDF'}
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={creating}
              className="bg-rose-600 hover:bg-rose-700 text-white px-8 gap-2"
              size="lg"
            >
              <Printer className="h-5 w-5" />
              {creating ? 'Creating…' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Hidden printable invoice container — professional layout     */}
      {/* ============================================================ */}
      <div
        id="print-area"
        ref={printAreaRef}
        className="hidden print:block w-full bg-white text-[#1a1a1a]"
        style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
      >
        {/* Header: brand mark + company contact block */}
        <div className="flex justify-between items-start w-full pb-5 mb-5 border-b-2 border-[#8f1414]">
          <div className="flex flex-col items-start select-none">
            <img
              src="/logo.png"
              alt="FGC Autos Ltd Logo"
              crossOrigin="anonymous"
              className="h-[80px] w-auto object-contain"
            />
          </div>

          <div className="text-right text-[10.5px] leading-relaxed text-gray-600">
            <div>154 Obafemi Awolowo Way, Ikeja, Lagos</div>
            <div>08030523555 &nbsp;·&nbsp; 07014858241</div>
            <div>info@fgcautosltd.com &nbsp;·&nbsp; www.fgcautosltd.com</div>
          </div>
        </div>

        {/* Document title + reference numbers */}
        <div className="flex justify-between items-start w-full mb-6">
          <div>
            <div className="text-[26px] font-bold tracking-tight text-[#1a1a1a]">
              INVOICE
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              Quote No. <span className="font-semibold text-[#1a1a1a]">{quoteNumber}</span>
            </div>
          </div>

          <table className="text-[11px] text-right">
            <tbody>
              <tr>
                <td className="pr-3 py-0.5 text-gray-500">Invoice Date</td>
                <td className="py-0.5 font-semibold text-[#1a1a1a]">{formatPrintDate(invoiceDate)}</td>
              </tr>
              <tr>
                <td className="pr-3 py-0.5 text-gray-500">Due Date</td>
                <td className="py-0.5 font-semibold text-[#1a1a1a]">{formatPrintDate(dueDate)}</td>
              </tr>
              <tr>
                <td className="pr-3 py-0.5 text-gray-500">RC No.</td>
                <td className="py-0.5 font-semibold text-[#1a1a1a]">{rcNo}</td>
              </tr>
              <tr>
                <td className="pr-3 py-0.5 text-gray-500">TIN</td>
                <td className="py-0.5 font-semibold text-[#1a1a1a]">{tin}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bill-to + vehicle summary */}
        <div className="grid grid-cols-2 gap-6 w-full mb-6">
          <div>
            <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-gray-500 mb-1.5">
              Bill To
            </div>
            <div className="text-[12px] font-semibold whitespace-pre-line leading-relaxed text-[#1a1a1a]">
              {customerName}
            </div>
          </div>

          <div>
            <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-gray-500 mb-1.5">
              Vehicle
            </div>
            <table className="w-full text-[11.5px]">
              <tbody>
                <tr>
                  <td className="py-0.5 pr-2 text-gray-500 w-24">Model</td>
                  <td className="py-0.5 font-semibold text-[#1a1a1a] whitespace-nowrap text-[10px]">{vehicleModel.toUpperCase()}</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 text-gray-500">Year</td>
                  <td className="py-0.5 font-semibold text-[#1a1a1a]">{vehicleYear}</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 text-gray-500">Reg. Number</td>
                  <td className="py-0.5 font-semibold text-[#1a1a1a]">{regNumber.toUpperCase()}</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 text-gray-500">Sales Rep</td>
                  <td className="py-0.5 font-semibold text-[#1a1a1a]">{salesRep.toUpperCase()}</td>
                </tr>
                {driverNumber && (
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">Driver Number</td>
                    <td className="py-0.5 font-semibold text-[#1a1a1a]">{driverNumber.toUpperCase()}</td>
                  </tr>
                )}
                {branch && (
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">Branch</td>
                    <td className="py-0.5 font-semibold text-[#1a1a1a]">{branch.toUpperCase()}</td>
                  </tr>
                )}
                {unit && (
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">Unit</td>
                    <td className="py-0.5 font-semibold text-[#1a1a1a]">{unit.toUpperCase()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse text-[11.5px] mb-1">
          <thead>
            <tr className="bg-[#1a1a1a] text-white text-[9.5px] uppercase tracking-wider">
              <th className="text-left font-semibold py-2 pl-3 pr-2 w-[6%]">No.</th>
              <th className="text-left font-semibold py-2 px-2 w-[52%]">Description</th>
              <th className="text-center font-semibold py-2 px-2 w-[10%]">Qty</th>
              <th className="text-right font-semibold py-2 px-2 w-[16%]">Unit Price</th>
              <th className="text-right font-semibold py-2 pr-3 pl-2 w-[16%]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr
                key={it.id}
                className={`border-b border-gray-200 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}
              >
                <td className="py-2 pl-3 pr-2 text-gray-500">{i + 1}</td>
                <td className="py-2 px-2 font-medium">{it.description}</td>
                <td className="py-2 px-2 text-center">{it.quantity}</td>
                <td className="py-2 px-2 text-right tabular-nums">₦{formatNaira(it.unitPrice)}</td>
                <td className="py-2 pr-3 pl-2 text-right font-semibold tabular-nums">
                  ₦{formatNaira(it.quantity * it.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="w-full border-b-2 border-[#1a1a1a] mb-4" />

        {/* Totals + terms side by side */}
        <div className="flex justify-between items-start w-full mb-8">
          <div className="w-[55%] text-[10.5px] text-gray-600 leading-relaxed">
            <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-gray-500 mb-1.5">
              Terms
            </div>
            <div>Quotation Validity: <span className="font-semibold text-[#1a1a1a]">{validity}</span></div>
            <div>Payment Terms: <span className="font-semibold text-[#1a1a1a]">{paymentTerms}</span></div>
          </div>

          <table className="w-[38%] text-[11.5px]">
            <tbody>
              <tr>
                <td className="py-1 text-gray-500">Subtotal</td>
                <td className="py-1 text-right font-medium tabular-nums">₦{formatNaira(subtotal)}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-500">Tax ({taxRate}%)</td>
                <td className="py-1 text-right font-medium tabular-nums">₦{formatNaira(taxAmount)}</td>
              </tr>
              <tr className="border-t-2 border-[#1a1a1a]">
                <td className="pt-2 font-bold text-[13px] text-[#1a1a1a]">Total Due</td>
                <td className="pt-2 text-right font-bold text-[13px] text-[#8f1414] tabular-nums">
                  ₦{formatNaira(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature block */}
        <div className="flex justify-between items-end w-full mb-8 px-2">
          <div className="w-[40%] text-center">
            <div className="border-b border-gray-400 h-10" />
            <div className="mt-1.5 text-[9.5px] uppercase tracking-wide text-gray-500">
              Prepared By
            </div>
          </div>
          <div className="w-[40%] text-center">
            <div className="border-b border-gray-400 h-10" />
            <div className="mt-1.5 text-[9.5px] uppercase tracking-wide text-gray-500">
              Authorised Signature
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full border-t border-gray-200 pt-3 text-center text-[9.5px] text-gray-500">
          Thank you for your business — FGC Autos Ltd &nbsp;·&nbsp; www.fgcautosltd.com
        </div>
      </div>
    </div>
  );
}