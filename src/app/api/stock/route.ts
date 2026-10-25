import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [movements, products] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { storeId: session.storeId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.product.findMany({
      where: { storeId: session.storeId },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        stock: true,
        minStock: true,
        costPrice: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ movements, products });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, type, quantity, note, newCostPrice } = body;

    if (!productId || !type || quantity === undefined) {
      return NextResponse.json(
        { error: "Pilih barang, jenis perubahan stok, dan jumlahnya." },
        { status: 400 }
      );
    }

    const parsedQty = Number(quantity);
    if (isNaN(parsedQty) || parsedQty === 0) {
      return NextResponse.json(
        { error: "Jumlah perubahan stok tidak boleh 0." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: session.storeId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan." },
        { status: 404 }
      );
    }

    // Untuk type IN: quantity selalu positif (+).
    // Untuk type ADJUST: bisa mengurangi (barang rusak/hilang) atau menambah (koreksi opname).
    let delta = parsedQty;
    if (type === "IN" && parsedQty < 0) {
      delta = Math.abs(parsedQty);
    }

    const updatedStock = product.stock + delta;
    if (updatedStock < 0) {
      return NextResponse.json(
        {
          error: `Stok tidak mencukupi. Stok saat ini hanya ${product.stock} ${product.unit}.`,
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updateData: { stock: number; costPrice?: number } = {
        stock: updatedStock,
      };

      if (
        type === "IN" &&
        newCostPrice !== undefined &&
        Number(newCostPrice) > 0
      ) {
        updateData.costPrice = Number(newCostPrice);
      }

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: updateData,
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          storeId: session.storeId,
          type,
          quantity: delta,
          note:
            note?.trim() ||
            (type === "IN" ? "Kulakan / Restock Barang" : "Penyesuaian Stok Opname"),
        },
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true },
          },
        },
      });

      return { updatedProduct, movement };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Stock movement error:", error);
    return NextResponse.json(
      { error: "Gagal mencatat perubahan stok." },
      { status: 500 }
    );
  }
}

