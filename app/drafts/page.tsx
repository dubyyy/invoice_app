'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Search, Trash2, Edit3, ArrowLeft, Calendar, User, Car, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

interface DraftItem {
  localStorageKey: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  rcNo: string;
  tin: string;
  quoteNumber: string;
  vehicleModel: string;
  vehicleYear: string;
  regNumber: string;
  validity: string;
  paymentTerms: string;
  salesRep: string;
  driverNumber: string;
  branch: string;
  unit: string;
  taxRate: number;
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number }>;
  attachedPdfName: string | null;
  savedAt: string;
}

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = React.useState<DraftItem[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const fetchDrafts = React.useCallback(() => {
    try {
      setLoading(true);
      const list: DraftItem[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key === 'fgc_invoice_draft' || key.startsWith('fgc_invoice_draft_'))) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              list.push({
                localStorageKey: key,
                customerName: parsed.customerName || '',
                invoiceDate: parsed.invoiceDate || '',
                dueDate: parsed.dueDate || '',
                rcNo: parsed.rcNo || '',
                tin: parsed.tin || '',
                quoteNumber: parsed.quoteNumber || '',
                vehicleModel: parsed.vehicleModel || '',
                vehicleYear: parsed.vehicleYear || '',
                regNumber: parsed.regNumber || '',
                validity: parsed.validity || '',
                paymentTerms: parsed.paymentTerms || '',
                salesRep: parsed.salesRep || '',
                driverNumber: parsed.driverNumber || '',
                branch: parsed.branch || '',
                unit: parsed.unit || '',
                taxRate: parsed.taxRate ?? 7.5,
                items: parsed.items || [],
                attachedPdfName: parsed.attachedPdfName || null,
                savedAt: parsed.savedAt || new Date().toISOString(),
              });
            } catch (e) {
              console.error('Error parsing draft from localStorage key:', key, e);
            }
          }
        }
      }
      // Sort drafts by savedAt desc
      list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      setDrafts(list);
    } catch (err) {
      console.error('Error fetching drafts:', err);
      toast.error('Failed to load drafts.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleDelete = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem(key);
      toast.success('Draft deleted');
      fetchDrafts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete draft');
    }
  };

  const handleEdit = (draft: DraftItem) => {
    try {
      localStorage.setItem('fgc_load_draft_trigger', JSON.stringify(draft));
      router.push('/');
    } catch (err) {
      console.error(err);
      toast.error('Failed to prepare draft loading');
    }
  };

  const calculateTotal = (draft: DraftItem) => {
    const subtotal = draft.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const tax = subtotal * (draft.taxRate / 100);
    return subtotal + tax;
  };

  const filtered = drafts.filter((d) =>
    (d.quoteNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.vehicleModel || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Invoice Drafts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your saved draft invoices. Load them back to edit or create invoices.
          </p>
        </div>
        <Button onClick={() => router.push('/')} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search draft customer, vehicle, or quote no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg border-input bg-background/50">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {search ? 'No drafts match your search.' : 'No drafts saved yet.'}
          </p>
          {!search && (
            <Button variant="outline" onClick={() => router.push('/')} className="mt-4">
              Create your first draft
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((draft) => {
            const total = calculateTotal(draft);
            const savedDate = new Date(draft.savedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card
                key={draft.localStorageKey}
                onClick={() => handleEdit(draft)}
                className="group relative flex flex-col justify-between p-5 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer bg-card"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      Draft
                    </span>
                    <span className="text-[10px] text-muted-foreground">{savedDate}</span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base text-foreground group-hover:text-rose-700 transition-colors truncate">
                      {draft.quoteNumber || 'Untitled Draft'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      {draft.customerName.split('\n')[0] || 'No customer name'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block font-medium">Vehicle</span>
                      <span className="font-medium text-foreground truncate block flex items-center gap-1 mt-0.5">
                        <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {draft.vehicleModel || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block font-medium">Total Amount</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDelete(draft.localStorageKey, e)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => handleEdit(draft)}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit Draft
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
