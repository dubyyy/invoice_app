'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePrices } from '@/hooks/use-prices';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Price, PriceCategory } from '@/types';

export default function PricesPage() {
  const { prices, loading, addPrice, updatePrice, deletePrice } = usePrices();
  const [search, setSearch] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Price | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // form state
  const [itemName, setItemName] = React.useState('');
  const [category, setCategory] = React.useState<PriceCategory>('Service');
  const [unitPrice, setUnitPrice] = React.useState('');
  const [vehicleModel, setVehicleModel] = React.useState('');
  const [vehicleYear, setVehicleYear] = React.useState('');
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {}
  );

  const filtered = prices.filter((p) =>
    p.itemName.toLowerCase().includes(search.toLowerCase()) ||
    (p.vehicleModel && p.vehicleModel.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditing(null);
    setItemName('');
    setCategory('Product');
    setUnitPrice('');
    setVehicleModel('');
    setVehicleYear('');
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (price: Price) => {
    setEditing(price);
    setItemName(price.itemName);
    setCategory(price.category);
    setUnitPrice(String(price.unitPrice));
    setVehicleModel(price.vehicleModel || '');
    setVehicleYear(price.vehicleYear || '');
    setFormErrors({});
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!itemName.trim()) next.itemName = 'Item name is required';
    if (!unitPrice || parseFloat(unitPrice) < 0)
      next.unitPrice = 'Enter a valid price';
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data = {
      itemName: itemName.trim(),
      category,
      unitPrice: parseFloat(unitPrice),
      vehicleModel: vehicleModel.trim() || undefined,
      vehicleYear: vehicleYear.trim() || undefined,
    };
    if (editing) {
      updatePrice(editing.id, data);
      toast.success('Price updated', { description: data.itemName });
    } else {
      addPrice(data);
      toast.success('Price added', { description: data.itemName });
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const removed = prices.find((p) => p.id === deleteId);
    deletePrice(deleteId);
    setDeleteId(null);
    toast.success('Price deleted', {
      description: removed?.itemName ?? '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Price List
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the items and auto part prices associated with specific vehicle models.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary">
          <Plus className="mr-1.5 h-4 w-4" /> Add Price
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search items or vehicle models…"
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
            <Tag className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {search
                ? 'No items match your search.'
                : 'No prices yet. Click "Add Price" to create one.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="w-36">Vehicle Model</TableHead>
                <TableHead className="w-32">Category</TableHead>
                <TableHead className="w-32 text-right">Unit Price</TableHead>
                <TableHead className="w-40">Last Updated</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((price) => (
                <TableRow key={price.id}>
                  <TableCell className="font-medium text-foreground">
                    {price.itemName}
                  </TableCell>
                  <TableCell>
                    {price.vehicleModel ? (
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50/50 uppercase font-semibold">
                          {price.vehicleModel}
                        </Badge>
                        {price.vehicleYear && (
                          <span className="text-[10px] text-muted-foreground font-medium pl-1">
                            Year: {price.vehicleYear}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={price.category === 'Service' ? 'default' : 'secondary'}
                      className={
                        price.category === 'Service'
                          ? 'bg-primary hover:bg-primary/80'
                          : ''
                      }
                    >
                      {price.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(price.unitPrice)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(price.lastUpdated)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(price)}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                        aria-label="Edit price"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(price.id)}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete price"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Price' : 'Add Price'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the details of this price item.'
                : 'Create a new item for your price list.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                placeholder="e.g. FRONT BRAKE PADS"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className={formErrors.itemName ? 'border-destructive' : ''}
              />
              {formErrors.itemName && (
                <p className="text-xs text-destructive">{formErrors.itemName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleModel">Vehicle Model (Optional)</Label>
              <Input
                id="vehicleModel"
                placeholder="e.g. GAC GA3s"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleYear">Vehicle Year (Optional)</Label>
              <Input
                id="vehicleYear"
                placeholder="e.g. 2016"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as PriceCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₦
                </span>
                <Input
                  id="unitPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className={`pl-7 ${
                    formErrors.unitPrice ? 'border-destructive' : ''
                  }`}
                />
              </div>
              {formErrors.unitPrice && (
                <p className="text-xs text-destructive">
                  {formErrors.unitPrice}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-primary">
              {editing ? 'Save Changes' : 'Add Price'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this price?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The item will be permanently
              removed from your price list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
