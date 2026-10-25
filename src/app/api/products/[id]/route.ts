import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { name, sku, categoryId, unit, costPrice, sellPrice, minStock } = body;

    const existing = await prisma.product.findFirst({
      where: { id, storeId: session.storeId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        sku: sku?.trim().toUpperCase() || existing.sku,
        categoryId: categoryId === "" ? null : categoryId ?? existing.categoryId,
        unit: unit || existing.unit,
        costPrice: costPrice !== undefined ? Number(costPrice) : existing.costPrice,
        sellPrice: sellPrice !== undefined ? Number(sellPrice) : existing.sellPrice,
        minStock: minStock !== undefined ? Number(minStock) : existing.minStock,
      },
      include: { category: true },
    });

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data barang." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const deleted = await prisma.product.deleteMany({
      where: { id, storeId: session.storeId },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Barang berhasil dihapus." });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus barang." },
      { status: 500 }
    );
  }
}

