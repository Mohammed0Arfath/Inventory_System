"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  MapPin,
  ShoppingBag,
  AlertCircle,
  Loader2,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/CountdownTimer";
import { formatCurrency } from "@/lib/utils";
import type { ReservationResponse } from "@/lib/schemas";

type PageState = "loading" | "active" | "confirmed" | "released" | "expired" | "error";

export default function ReservationPage({
  params,
}: {
  params: { id: string };
}) {
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const hasExpiredRef = useRef(false);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${params.id}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setPageState("error");
        return;
      }
      const data: ReservationResponse = await res.json();
      setReservation(data);

      if (data.status === "CONFIRMED") setPageState("confirmed");
      else if (data.status === "RELEASED") setPageState("released");
      else if (new Date(data.expiresAt) < new Date()) setPageState("expired");
      else setPageState("active");
    } catch {
      setPageState("error");
    }
  }, [params.id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  const handleExpire = useCallback(() => {
    if (!hasExpiredRef.current) {
      hasExpiredRef.current = true;
      setPageState("expired");
    }
  }, []);

  const handleConfirm = async () => {
    setIsActing(true);
    setActionError(null);
    setErrorCode(null);

    try {
      const res = await fetch(`/api/reservations/${params.id}/confirm`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.status === 410) {
        setActionError(data.error);
        setErrorCode("RESERVATION_EXPIRED");
        setPageState("expired");
        return;
      }

      if (res.status === 409) {
        setActionError(data.error);
        return;
      }

      if (!res.ok) {
        setActionError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setReservation(data);
      setPageState("confirmed");
    } catch {
      setActionError("Network error. Please check your connection.");
    } finally {
      setIsActing(false);
    }
  };

  const handleRelease = async () => {
    setIsActing(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/reservations/${params.id}/release`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error ?? "Failed to cancel reservation.");
        return;
      }

      setReservation(data);
      setPageState("released");
    } catch {
      setActionError("Network error. Please check your connection.");
    } finally {
      setIsActing(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="h-6 w-32 shimmer-skeleton rounded-lg mb-8" />
        <div className="h-96 shimmer-skeleton rounded-2xl" />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (pageState === "error" || !reservation) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center py-24 animate-fade-in text-center">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-white font-semibold text-xl mb-2">Reservation not found</h2>
        <p className="text-white/40 text-sm mb-6">
          This reservation may have expired or doesn&apos;t exist.
        </p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to products
          </Button>
        </Link>
      </div>
    );
  }

  // ── Confirmed state ──────────────────────────────────────────────────────
  if (pageState === "confirmed") {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="card-dark p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 animate-pulse-ring">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-white/50 text-sm mb-6">
            Your purchase is complete. The units have been permanently allocated to your order.
          </p>

          <div className="rounded-xl bg-white/3 border border-white/8 p-4 text-left mb-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-white/40 text-sm">Product</span>
              <span className="text-white text-sm font-medium">{reservation.product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-sm">Warehouse</span>
              <span className="text-white text-sm">{reservation.warehouse.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-sm">Quantity</span>
              <span className="text-white text-sm">{reservation.quantity} unit{reservation.quantity !== 1 ? "s" : ""}</span>
            </div>
            <div className="border-t border-white/8 pt-3 flex justify-between">
              <span className="text-white/60 text-sm font-medium">Total Paid</span>
              <span className="text-emerald-400 font-bold text-lg">
                {formatCurrency(reservation.product.price * reservation.quantity)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-xs">Reservation ID</span>
              <span className="text-white/40 text-xs font-mono">{reservation.id.slice(0, 12)}…</span>
            </div>
          </div>

          <Link href="/">
            <Button className="w-full" variant="success" id="back-to-products-confirmed">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Released / Cancelled state ───────────────────────────────────────────
  if (pageState === "released") {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="card-dark p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-white/30" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Reservation Cancelled</h1>
          <p className="text-white/50 text-sm mb-6">
            This reservation has been released. The units are available again for other customers.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full" id="back-to-products-released">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Expired state ────────────────────────────────────────────────────────
  if (pageState === "expired") {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="card-dark p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Timer className="h-10 w-10 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Reservation Expired</h1>
          <p className="text-white/50 text-sm mb-2">
            Your 10-minute hold has ended. The units have been released back to available stock.
          </p>
          {errorCode === "RESERVATION_EXPIRED" && actionError && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 mb-4 text-left animate-fade-in">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300 text-sm">{actionError}</p>
            </div>
          )}
          <Link href="/">
            <Button className="w-full mt-4" id="try-again-expired">
              Reserve Again
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Active reservation state ──────────────────────────────────────────────
  const subtotal = reservation.product.price * reservation.quantity;

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to products
      </Link>

      {/* Main card */}
      <div className="card-dark overflow-hidden">
        {/* Purple top bar */}
        <div className="h-1.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600" />

        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-violet-400 text-xs font-semibold uppercase tracking-wider">
                Active Reservation
              </span>
            </div>
            <h1 className="text-white font-bold text-2xl">Checkout</h1>
            <p className="text-white/40 text-sm mt-1">
              Complete your purchase before the timer expires.
            </p>
          </div>

          {/* Countdown */}
          <div className="rounded-xl bg-white/3 border border-white/8 p-4">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Time Remaining
            </p>
            <CountdownTimer expiresAt={reservation.expiresAt} onExpire={handleExpire} />
            <p className="text-white/25 text-xs mt-2">
              Expires at {new Date(reservation.expiresAt).toLocaleTimeString()}
            </p>
          </div>

          {/* Product info */}
          <div className="space-y-3">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">
              Order Summary
            </p>
            <div className="rounded-xl bg-white/[0.02] border border-white/8 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight">
                    {reservation.product.name}
                  </p>
                  <p className="text-white/30 text-xs">SKU: {reservation.product.sku}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 text-white/50 text-xs">
                <MapPin className="h-3.5 w-3.5 text-white/30" />
                {reservation.warehouse.name} · {reservation.warehouse.location}
              </div>

              <div className="space-y-2 border-t border-white/8 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Unit price</span>
                  <span className="text-white">{formatCurrency(reservation.product.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Quantity</span>
                  <span className="text-white">{reservation.quantity}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/8">
                  <span className="text-white/70 font-semibold">Total</span>
                  <span className="text-white font-bold text-xl">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reservation metadata */}
          <div className="flex items-center justify-between text-xs text-white/25 px-1">
            <span className="flex items-center gap-1">
              <ShoppingBag className="h-3 w-3" />
              ID: {reservation.id.slice(0, 16)}…
            </span>
            <span>Created {new Date(reservation.createdAt).toLocaleTimeString()}</span>
          </div>

          {/* Error display */}
          {actionError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 animate-fade-in">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{actionError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-1">
            <Button
              size="xl"
              className="w-full"
              onClick={handleConfirm}
              disabled={isActing}
              id="confirm-purchase"
            >
              {isActing && !actionError ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "✓ Confirm Purchase"
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRelease}
              disabled={isActing}
              id="cancel-purchase"
            >
              {isActing && actionError ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Cancel Reservation
            </Button>
          </div>

          <p className="text-white/20 text-xs text-center pb-1">
            No payment is charged until you confirm. Cancellation is instant.
          </p>
        </div>
      </div>
    </div>
  );
}
