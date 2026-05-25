"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Package, ShoppingCart, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/StockBadge";
import { formatCurrency } from "@/lib/utils";
import type { ProductResponse, StockWithWarehouse } from "@/lib/schemas";

interface ReservationModalProps {
  product: ProductResponse;
  isOpen: boolean;
  onClose: () => void;
}

export function ReservationModal({ product, isOpen, onClose }: ReservationModalProps) {
  const router = useRouter();
  const [selectedStock, setSelectedStock] = useState<StockWithWarehouse | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableStock = product.stock.filter((s) => s.availableUnits > 0);

  const handleReserve = async () => {
    if (!selectedStock) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId: selectedStock.id, quantity }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(data.error ?? "Not enough stock available.");
        } else {
          setError(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      // Success — navigate to reservation page
      router.push(`/reservation/${data.id}`);
      onClose();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedStock(null);
      setQuantity(1);
      setError(null);
      onClose();
    }
  };

  const maxQty = selectedStock ? Math.min(selectedStock.availableUnits, 10) : 1;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-violet-400" />
            Reserve Units
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Hold units for 10 minutes while you complete payment.
          </DialogDescription>
        </DialogHeader>

        {/* Product info */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">{product.name}</p>
                <p className="text-white/40 text-xs mt-0.5">SKU: {product.sku}</p>
              </div>
            </div>
            <p className="text-violet-300 font-bold text-lg whitespace-nowrap">
              {formatCurrency(product.price)}
            </p>
          </div>
        </div>

        {/* Warehouse selection */}
        <div>
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
            Select Warehouse
          </p>
          <div className="space-y-2">
            {availableStock.length === 0 ? (
              <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 text-center">
                <p className="text-red-400 text-sm">No stock available in any warehouse.</p>
              </div>
            ) : (
              product.stock.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    if (s.availableUnits > 0) {
                      setSelectedStock(s);
                      setQuantity(1);
                      setError(null);
                    }
                  }}
                  disabled={s.availableUnits === 0 || isLoading}
                  className={`w-full rounded-xl p-3 border text-left transition-all duration-150 ${
                    selectedStock?.id === s.id
                      ? "border-violet-500/60 bg-violet-500/10"
                      : s.availableUnits === 0
                      ? "border-white/5 bg-white/2 opacity-40 cursor-not-allowed"
                      : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5 cursor-pointer"
                  }`}
                  id={`warehouse-${s.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-white/90 text-sm font-medium">{s.warehouseName}</span>
                    </div>
                    <StockBadge available={s.availableUnits} />
                  </div>
                  <p className="text-white/30 text-xs mt-1 ml-5">{s.warehouseLocation}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Quantity selector */}
        {selectedStock && (
          <div className="animate-fade-in">
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
              Quantity
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || isLoading}
                className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 disabled:opacity-40 transition-colors"
                id="qty-decrease"
              >
                −
              </button>
              <span className="text-white font-bold text-xl w-8 text-center tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty || isLoading}
                className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 disabled:opacity-40 transition-colors"
                id="qty-increase"
              >
                +
              </button>
              <span className="text-white/30 text-sm">
                of {selectedStock.availableUnits} available
              </span>
            </div>

            {/* Subtotal */}
            <div className="mt-3 rounded-lg bg-white/3 border border-white/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Subtotal</span>
                <span className="text-white font-bold">
                  {formatCurrency(product.price * quantity)}
                </span>
              </div>
              <p className="text-white/30 text-xs mt-1">
                Reserved for 10 minutes · No charge until payment
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClose}
            disabled={isLoading}
            id="cancel-reserve"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleReserve}
            disabled={!selectedStock || isLoading || availableStock.length === 0}
            id="confirm-reserve"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reserving...
              </>
            ) : (
              "Reserve Now"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
