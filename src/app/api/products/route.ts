import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: session.storeId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: { storeId: session.storeId },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ products, categories });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      sku,
      categoryId,
      unit,
      costPrice,
      sellPrice,
      stock,
      minStock,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama barang wajib diisi." },
        { status: 400 }
      );
    }

    const parsedCost = Number(costPrice) || 0;
    const parsedSell = Number(sellPrice) || 0;
    const parsedStock = Number(stock) || 0;
    const parsedMinStock = Number(minStock) ?? 5;

    const generatedSku =
      sku && sku.trim()
        ? sku.trim().toUpperCase()
        : `BRG-${Math.floor(1000 + Math.random() * 9000)}`;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: name.trim(),
          sku: generatedSku,
          categoryId: categoryId || null,
          unit: unit || "pcs",
          costPrice: parsedCost,
          sellPrice: parsedSell,
          stock: parsedStock,
          minStock: parsedMinStock,
          storeId: session.storeId,
        },
        include: { category: true },
      });

      if (parsedStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            storeId: session.storeId,
            type: "IN",
            quantity: parsedStock,
            note: "Stok awal barang baru",
          },
        });
      }

      return created;
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan barang baru." },
      { status: 500 }
    );
  }
}

