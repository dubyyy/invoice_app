'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { FileText, Search, Printer, Calendar, User, Car, ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';
import type { Invoice, LineItem } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function HistoryPage() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [downloading, setDownloading] = React.useState(false);
  
  const printPreviewRef = React.useRef<HTMLDivElement>(null);

  const fetchInvoices = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoice history');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filtered = invoices.filter((inv) =>
    inv.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
    inv.vehicleModel.toLowerCase().includes(search.toLowerCase())
  );

  const calculateSubtotal = (items: LineItem[]) => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTaxAmount = (subtotal: number, taxRate: number) => {
    return subtotal * (taxRate / 100);
  };

  const formatPrintDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handlePrintSelected = () => {
    const printContent = printPreviewRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${selectedInvoice?.quoteNumber}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              color: #1a1a1a;
              margin: 0;
              padding: 0.45in;
              box-sizing: border-box;
            }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .items-end { align-items: flex-end; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .w-full { width: 100%; }
            .pb-5 { padding-bottom: 1.25rem; }
            .mb-5 { margin-bottom: 1.25rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mt-1.5 { margin-top: 0.375rem; }
            .border-b-2 { border-bottom-width: 2px; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t-2 { border-top: 2px solid #1a1a1a; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .border-gray-400 { border-color: #9ca3af; }
            .border-gray-200 { border-color: #e5e7eb; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-500 { color: #6b7280; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .uppercase { text-transform: uppercase; }
            .tracking-tight { letter-spacing: -0.025em; }
            .tracking-wide { letter-spacing: 0.025em; }
            .whitespace-pre-line { white-space: pre-line; }
            .bg-gray-50 { background-color: #f9fafb; }
            
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 0.5rem; }
            th { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { font-size: 11.5px; }
            
            .invoice-title { font-size: 26px; font-weight: bold; tracking-tight: -0.025em; }
            .brand-line { border-bottom-color: #8f1414; }
            .total-due { font-size: 13px; color: #8f1414; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPdf = async () => {
    if (!selectedInvoice) return;
    setDownloading(true);
    try {
      const node = printPreviewRef.current;
      if (!node) throw new Error('Invoice content not found');

      // Temporarily show the print area container to rasterize it correctly
      const prevStyle = node.style.display;
      node.style.display = 'block';
      node.style.width = '793.7px';
      node.style.padding = '43.2px';
      node.style.boxSizing = 'border-box';

      // Let the browser paint
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 793.7,
      });

      // Restore style
      node.style.display = prevStyle;
      node.style.width = '';
      node.style.padding = '';
      node.style.boxSizing = '';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
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

      pdf.save(`Invoice-${selectedInvoice.quoteNumber || 'FGC-Autos'}.pdf`);
      toast.success('Invoice PDF downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Invoice History
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View, print, or download previously created FGC Autos invoices.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customer, vehicle, or quote no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {search
                ? 'No invoices match your search.'
                : 'No invoices created yet.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Quote Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-36">Vehicle Model</TableHead>
                <TableHead className="w-32">Date</TableHead>
                <TableHead className="w-32 text-right">Total Due</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => {
                const sub = calculateSubtotal(inv.items);
                const tax = calculateTaxAmount(sub, inv.taxRate);
                const tot = sub + tax;

                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-semibold text-foreground">
                      {inv.quoteNumber || '—'}
                    </TableCell>
                    <TableCell className="font-medium text-foreground whitespace-pre-line max-w-xs truncate">
                      {inv.customerName.split('\n')[0]}
                    </TableCell>
                    <TableCell className="uppercase text-xs font-medium">
                      {inv.vehicleModel || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPrintDate(inv.invoiceDate)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {formatCurrency(tot)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        {selectedInvoice && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold">
                  Invoice details ({selectedInvoice.quoteNumber})
                </DialogTitle>
              </div>
              <div className="flex gap-2 mr-6">
                <Button variant="outline" size="sm" onClick={handlePrintSelected} className="gap-1">
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button variant="default" size="sm" onClick={handleDownloadPdf} disabled={downloading} className="gap-1 bg-rose-600 hover:bg-rose-700 text-white">
                  <Download className="h-4 w-4" /> {downloading ? 'Downloading...' : 'PDF'}
                </Button>
              </div>
            </DialogHeader>

            {/* Premium printable preview content inside the modal */}
            <div className="p-4 bg-muted/20 rounded-lg">
              <div
                ref={printPreviewRef}
                className="bg-white p-8 shadow-sm border rounded text-[#1a1a1a]"
                style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
              >
                {/* Header */}
                <div className="flex justify-between items-start w-full pb-5 mb-5 border-b-2 border-b-2 border-[#8f1414] brand-line">
                  <div className="flex flex-col items-start select-none">
                    <img
                      src="/logo.png"
                      alt="FGC Autos Ltd Logo"
                      crossOrigin="anonymous"
                      className="h-[60px] w-auto object-contain"
                    />
                  </div>
                  <div className="text-right text-[10.5px] leading-relaxed text-gray-600">
                    <div>154 Obafemi Awolowo Way, Ikeja, Lagos</div>
                    <div>08030523555 &nbsp;·&nbsp; 07014858241</div>
                    <div>info@fgcautosltd.com &nbsp;·&nbsp; www.fgcautosltd.com</div>
                  </div>
                </div>

                {/* Doc Title */}
                <div className="flex justify-between items-start w-full mb-6">
                  <div>
                    <div className="invoice-title">
                      INVOICE
                    </div>
                    <div className="mt-1.5 text-[11px] text-gray-500">
                      Quote No. <span className="font-semibold text-[#1a1a1a]">{selectedInvoice.quoteNumber}</span>
                    </div>
                  </div>
                  <table className="text-[11px] text-right" style={{ width: 'auto' }}>
                    <tbody>
                      <tr>
                        <td className="pr-3 py-0.5 text-gray-500">Invoice Date</td>
                        <td className="py-0.5 font-semibold text-[#1a1a1a]">{formatPrintDate(selectedInvoice.invoiceDate)}</td>
                      </tr>
                      <tr>
                        <td className="pr-3 py-0.5 text-gray-500">Due Date</td>
                        <td className="py-0.5 font-semibold text-[#1a1a1a]">{formatPrintDate(selectedInvoice.dueDate)}</td>
                      </tr>
                      <tr>
                        <td className="pr-3 py-0.5 text-gray-500">RC No.</td>
                        <td className="py-0.5 font-semibold text-[#1a1a1a]">{selectedInvoice.rcNo}</td>
                      </tr>
                      <tr>
                        <td className="pr-3 py-0.5 text-gray-500">TIN</td>
                        <td className="py-0.5 font-semibold text-[#1a1a1a]">{selectedInvoice.tin}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Customer / Vehicle */}
                <div className="grid grid-cols-2 gap-6 w-full mb-6">
                  <div>
                    <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-gray-500 mb-1.5">
                      Bill To
                    </div>
                    <div className="text-[12px] font-semibold whitespace-pre-line leading-relaxed text-[#1a1a1a]">
                      {selectedInvoice.customerName}
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
                          <td className="py-0.5 font-semibold text-[#1a1a1a] whitespace-nowrap text-[10px] uppercase">{selectedInvoice.vehicleModel}</td>
                        </tr>
                        {selectedInvoice.vehicleYear && (
                          <tr>
                            <td className="py-0.5 pr-2 text-gray-500">Year</td>
                            <td className="py-0.5 font-semibold text-[#1a1a1a]">{selectedInvoice.vehicleYear}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="py-0.5 pr-2 text-gray-500">Reg. Number</td>
                          <td className="py-0.5 font-semibold text-[#1a1a1a] uppercase">{selectedInvoice.regNumber}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 pr-2 text-gray-500">Sales Rep</td>
                          <td className="py-0.5 font-semibold text-[#1a1a1a] uppercase">{selectedInvoice.salesRep}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Items */}
                <table className="w-full border-collapse text-[11.5px] mb-4">
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
                    {selectedInvoice.items.map((it, i) => (
                      <tr
                        key={it.id || i}
                        className={`border-b border-gray-200 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}
                      >
                        <td className="py-2 pl-3 pr-2 text-gray-500">{i + 1}</td>
                        <td className="py-2 px-2 font-medium">{it.description}</td>
                        <td className="py-2 px-2 text-center">{it.quantity}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(it.unitPrice)}</td>
                        <td className="py-2 pr-3 pl-2 text-right font-semibold">
                          {formatCurrency(it.quantity * it.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-between items-start w-full mb-8">
                  <div className="w-[55%] text-[10.5px] text-gray-600 leading-relaxed">
                    <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-gray-500 mb-1.5">
                      Terms
                    </div>
                    <div>Quotation Validity: <span className="font-semibold text-[#1a1a1a]">{selectedInvoice.validity}</span></div>
                    <div>Payment Terms: <span className="font-semibold text-[#1a1a1a]">{selectedInvoice.paymentTerms}</span></div>
                  </div>
                  <table className="w-[38%] text-[11.5px]">
                    <tbody>
                      <tr>
                        <td className="py-1 text-gray-500">Subtotal</td>
                        <td className="py-1 text-right font-medium">{formatCurrency(calculateSubtotal(selectedInvoice.items))}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-gray-500">Tax ({selectedInvoice.taxRate}%)</td>
                        <td className="py-1 text-right font-medium">{formatCurrency(calculateTaxAmount(calculateSubtotal(selectedInvoice.items), selectedInvoice.taxRate))}</td>
                      </tr>
                      <tr className="border-t-2 border-[#1a1a1a]">
                        <td className="pt-2 font-bold text-[13px] text-[#1a1a1a]">Total Due</td>
                        <td className="pt-2 text-right font-bold text-[13px] total-due">
                          {formatCurrency(calculateSubtotal(selectedInvoice.items) + calculateTaxAmount(calculateSubtotal(selectedInvoice.items), selectedInvoice.taxRate))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signature */}
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
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
