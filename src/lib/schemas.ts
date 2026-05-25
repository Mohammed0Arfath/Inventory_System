import { z } from "zod";

// ─── Request schemas ────────────────────────────────────────────────────────

export const CreateReservationSchema = z.object({
  stockId: z.string().min(1, "stockId is required"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(100, "Quantity cannot exceed 100 per reservation"),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

// ─── Response types ──────────────────────────────────────────────────────────

export type WarehouseResponse = {
  id: string;
  name: string;
  location: string;
};

export type StockWithWarehouse = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
};

export type ProductResponse = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sku: string;
  imageUrl: string | null;
  stock: StockWithWarehouse[];
  totalAvailable: number;
};

export type ReservationResponse = {
  id: string;
  stockId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    price: number;
    sku: string;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
};

// ─── Error response ──────────────────────────────────────────────────────────

export type ApiError = {
  error: string;
  code?: string;
  details?: unknown;
};
