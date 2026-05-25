import { PrismaClient, ReservationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const [wh1, wh2, wh3] = await Promise.all([
    prisma.warehouse.create({
      data: { name: "Mumbai Central", location: "Mumbai, Maharashtra" },
    }),
    prisma.warehouse.create({
      data: { name: "Delhi North", location: "New Delhi, Delhi" },
    }),
    prisma.warehouse.create({
      data: { name: "Bangalore South", location: "Bengaluru, Karnataka" },
    }),
  ]);

  console.log("✅ Created 3 warehouses");

  // Create products
  const [p1, p2, p3, p4, p5] = await Promise.all([
    prisma.product.create({
      data: {
        name: "Vitamin D3 + K2 Supplement",
        description:
          "High-potency Vitamin D3 (5000 IU) with Vitamin K2 MK-7 for bone and immune health. 120 softgels.",
        price: 899.0,
        sku: "VIT-D3K2-120",
        imageUrl: null,
      },
    }),
    prisma.product.create({
      data: {
        name: "Omega-3 Fish Oil",
        description:
          "Pharmaceutical-grade Omega-3 with 1200mg EPA+DHA per serving. Enteric-coated for no fishy burps. 90 capsules.",
        price: 1249.0,
        sku: "OMG3-1200-90",
        imageUrl: null,
      },
    }),
    prisma.product.create({
      data: {
        name: "Ashwagandha KSM-66",
        description:
          "Clinically studied KSM-66 Ashwagandha root extract (600mg). Supports stress, cortisol & testosterone. 60 capsules.",
        price: 749.0,
        sku: "ASHW-KSM66-60",
        imageUrl: null,
      },
    }),
    prisma.product.create({
      data: {
        name: "Magnesium Glycinate",
        description:
          "Highly bioavailable Magnesium Glycinate (400mg elemental Mg). Supports sleep, muscle recovery & mood. 120 tablets.",
        price: 649.0,
        sku: "MAG-GLYC-120",
        imageUrl: null,
      },
    }),
    prisma.product.create({
      data: {
        name: "Whey Protein Isolate – Chocolate",
        description:
          "Cold-processed whey isolate with 27g protein per scoop. Zero artificial sweeteners. 1kg pouch.",
        price: 2999.0,
        sku: "WPI-CHOC-1KG",
        imageUrl: null,
      },
    }),
  ]);

  console.log("✅ Created 5 products");

  // Create stock rows — deliberately set some low-stock for demo
  await Promise.all([
    // Product 1 — Vitamin D3
    prisma.stock.create({
      data: {
        productId: p1.id,
        warehouseId: wh1.id,
        totalUnits: 45,
        reservedUnits: 0,
      },
    }),
    prisma.stock.create({
      data: {
        productId: p1.id,
        warehouseId: wh2.id,
        totalUnits: 30,
        reservedUnits: 0,
      },
    }),
    prisma.stock.create({
      data: {
        productId: p1.id,
        warehouseId: wh3.id,
        totalUnits: 12,
        reservedUnits: 0,
      },
    }),

    // Product 2 — Omega-3
    prisma.stock.create({
      data: {
        productId: p2.id,
        warehouseId: wh1.id,
        totalUnits: 20,
        reservedUnits: 0,
      },
    }),
    prisma.stock.create({
      data: {
        productId: p2.id,
        warehouseId: wh2.id,
        totalUnits: 5,
        reservedUnits: 0,
      },
    }),
    prisma.stock.create({
      data: {
        productId: p2.id,
        warehouseId: wh3.id,
        totalUnits: 8,
        reservedUnits: 0,
      },
    }),

    // Product 3 — Ashwagandha — very low stock in Mumbai (1 unit = great for concurrency demo)
    prisma.stock.create({
      data: {
        productId: p3.id,
        warehouseId: wh1.id,
        totalUnits: 1,
        reservedUnits: 0,
      },
    }),
    prisma.stock.create({
      data: {
        productId: p3.id,
        warehouseId: wh2.id,
        totalUnits: 15,
        reservedUnits: 0,
      },
    }),
    prisma.stock.create({
      data: {
        productId: p3.id,
        warehouseId: wh3.id,
        totalUnits: 0,
        reservedUnits: 0,
      },
    }),

    // Product 4 — Magnesium
    prisma.stock.create({
      data: {
        productId: p4.id,
        warehouseId: wh1.id,
        totalUnits: 60,
        reservedUnits: 0,
      },
    }),
    prisma.stock.create({
      data: {
        productId: p4.id,
        warehouseId: wh2.id,
        totalUnits: 3,
        reservedUnits: 0,
      },
    }),
    prisma.stock.create({
      data: {
        productId: p4.id,
        warehouseId: wh3.id,
        totalUnits: 25,
        reservedUnits: 0,
      },
    }),

    // Product 5 — Whey Protein — 2 units in Bangalore
    prisma.stock.create({
      data: {
        productId: p5.id,
        warehouseId: wh1.id,
        totalUnits: 10,
        reservedUnits: 0,
      },
    }),
    prisma.stock.create({
      data: {
        productId: p5.id,
        warehouseId: wh2.id,
        totalUnits: 7,
        reservedUnits: 0,
      },
    }),
    prisma.stock.create({
      data: {
        productId: p5.id,
        warehouseId: wh3.id,
        totalUnits: 2,
        reservedUnits: 0,
      },
    }),
  ]);

  console.log("✅ Created stock rows for all product × warehouse combinations");
  console.log("🎉 Seed complete!");
  console.log("\n📋 Useful demo notes:");
  console.log("   • Ashwagandha KSM-66 at Mumbai Central has only 1 unit — perfect for concurrency demo");
  console.log("   • Omega-3 at Delhi North has 5 units");
  console.log("   • Whey Protein at Bangalore South has 2 units");
  console.log("   • Ashwagandha at Bangalore South has 0 units (out of stock)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
