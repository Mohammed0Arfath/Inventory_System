import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ProductResponse } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stock: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // For each stock row, compute available units by subtracting reservedUnits.
    // Note: reservedUnits is kept accurate by the atomic UPDATE logic, so no
    // need to re-query reservations here. This is the fast path.
    const response: ProductResponse[] = products.map((product) => {
      const stock = product.stock.map((s) => ({
        id: s.id,
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        warehouseLocation: s.warehouse.location,
        totalUnits: s.totalUnits,
        reservedUnits: s.reservedUnits,
        availableUnits: Math.max(s.totalUnits - s.reservedUnits, 0),
      }));

      const totalAvailable = stock.reduce((sum, s) => sum + s.availableUnits, 0);

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        sku: product.sku,
        imageUrl: product.imageUrl,
        stock,
        totalAvailable,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
