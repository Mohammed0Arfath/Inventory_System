"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, RefreshCw, Warehouse, TrendingDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/StockBadge";
import { ReservationModal } from "@/components/ReservationModal";
import { formatCurrency } from "@/lib/utils";
import type { ProductResponse } from "@/lib/schemas";

export default function HomePage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProducts = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch {
      setError("Failed to load products. Please check your connection.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Auto-refresh every 30 seconds to keep stock counts fresh
  useEffect(() => {
    const interval = setInterval(() => fetchProducts(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  const totalProducts = products.length;
  const outOfStockCount = products.filter((p) => p.totalAvailable === 0).length;
  const lowStockCount = products.filter(
    (p) => p.totalAvailable > 0 && p.totalAvailable <= 5
  ).length;

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 rounded-lg shimmer-skeleton mb-3" />
          <div className="h-4 w-96 rounded-lg shimmer-skeleton" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl shimmer-skeleton" />
          ))}
        </div>
        {/* Card skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-72 rounded-2xl shimmer-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-white font-semibold text-xl mb-2">Failed to load inventory</h2>
        <p className="text-white/40 text-sm mb-6">{error}</p>
        <Button onClick={() => fetchProducts()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Product{" "}
            <span className="gradient-text">Inventory</span>
          </h1>
          <p className="text-white/40 text-sm">
            Live stock across all warehouses · Auto-refreshes every 30s
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchProducts(true)}
          disabled={isRefreshing}
          id="refresh-inventory"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card-dark p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Package className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <p className="text-white/40 text-xs mb-0.5">Total Products</p>
            <p className="text-white font-bold text-2xl">{totalProducts}</p>
          </div>
        </div>
        <div className="card-dark p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <TrendingDown className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-white/40 text-xs mb-0.5">Low Stock SKUs</p>
            <p className="text-white font-bold text-2xl">{lowStockCount}</p>
          </div>
        </div>
        <div className="card-dark p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-white/40 text-xs mb-0.5">Out of Stock</p>
            <p className="text-white font-bold text-2xl">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            onReserve={() => setSelectedProduct(product)}
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>

      {/* Reservation modal */}
      {selectedProduct && (
        <ReservationModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            fetchProducts(true);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  onReserve,
  style,
}: {
  product: ProductResponse;
  onReserve: () => void;
  style?: React.CSSProperties;
}) {
  const isOutOfStock = product.totalAvailable === 0;

  return (
    <div
      className="card-dark p-5 flex flex-col gap-4 hover:border-white/14 transition-all duration-200 animate-fade-in group"
      style={style}
    >
      {/* Product header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
          <Package className="h-6 w-6 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-semibold text-sm leading-tight mb-1 line-clamp-2">
            {product.name}
          </h2>
          <p className="text-white/30 text-xs">SKU: {product.sku}</p>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold text-white">{formatCurrency(product.price)}</p>
        {isOutOfStock ? (
          <span className="text-xs text-red-400/70 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
            Unavailable
          </span>
        ) : (
          <span className="text-xs text-emerald-400/70 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
            {product.totalAvailable} total
          </span>
        )}
      </div>

      {/* Description */}
      {product.description && (
        <p className="text-white/40 text-xs leading-relaxed line-clamp-2">
          {product.description}
        </p>
      )}

      {/* Warehouse stock breakdown */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Warehouse className="h-3 w-3 text-white/30" />
          <p className="text-white/30 text-xs font-medium uppercase tracking-wider">
            Stock by Warehouse
          </p>
        </div>
        {product.stock.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-white/5"
          >
            <div>
              <p className="text-white/70 text-xs font-medium">{s.warehouseName}</p>
              <p className="text-white/25 text-xs">{s.warehouseLocation}</p>
            </div>
            <StockBadge available={s.availableUnits} showLabel={false} />
          </div>
        ))}
      </div>

      {/* Reserve button */}
      <Button
        className="w-full mt-auto"
        onClick={onReserve}
        disabled={isOutOfStock}
        variant={isOutOfStock ? "outline" : "default"}
        id={`reserve-${product.id}`}
      >
        {isOutOfStock ? "Out of Stock" : "Reserve Units →"}
      </Button>
    </div>
  );
}
