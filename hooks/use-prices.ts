'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Price } from '@/types';
import { toast } from 'sonner';

export function usePrices() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/prices');
      if (!res.ok) throw new Error('Failed to fetch prices');
      const data = await res.json();
      setPrices(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const addPrice = useCallback(async (data: Omit<Price, 'id' | 'lastUpdated'>) => {
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add price');
      const newPrice = await res.json();
      setPrices((prev) => [newPrice, ...prev]);
      return newPrice;
    } catch (err) {
      console.error(err);
      toast.error('Failed to add price');
    }
  }, []);

  const updatePrice = useCallback(async (id: string, data: Omit<Price, 'id' | 'lastUpdated'>) => {
    try {
      const res = await fetch(`/api/prices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update price');
      const updatedPrice = await res.json();
      setPrices((prev) =>
        prev.map((p) => (p.id === id ? updatedPrice : p))
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to update price');
    }
  }, []);

  const deletePrice = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/prices/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete price');
      setPrices((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete price');
    }
  }, []);

  return { prices, loading, addPrice, updatePrice, deletePrice, refresh: fetchPrices };
}
