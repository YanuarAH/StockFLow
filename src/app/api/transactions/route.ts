import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { storeId: session.storeId },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ transactions });
}

interface CartRequestItem {
  productId: string;
  quantity: number;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      items,
      paymentAmount,
      paymentMethod = "CASH",
      customerName,
    }: {
      items: CartRequestItem[];
      paymentAmount: number;
      paymentMethod?: string;
      customerName?: string;
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Keranjang belanja masih kosong." },
        { status: 400 }
      );
    }

    const productIds = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: session.storeId,
      },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let totalAmount = 0;
    let totalProfit = 0;

    const preparedItems: {
      productId: string;
      productName: string;
      unit: string;
      quantity: number;
      costPrice: number;
      sellPrice: number;
      subtotal: number;
    }[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: "Salah satu barang tidak ditemukan di toko Anda." },
          { status: 400 }
        );
      }

      const qty = Number(item.quantity);
      if (qty <= 0) {
        return NextResponse.json(
          { error: `Jumlah untuk ${product.name} tidak valid.` },
          { status: 400 }
        );
      }

      if (product.stock < qty) {
        return NextResponse.json(
          {
            error: `Stok "${product.name}" tidak cukup! Sisa stok: ${product.stock} ${product.unit}.`,
          },
          { status: 400 }
        );
      }

      const subtotal = product.sellPrice * qty;
      const itemProfit = (product.sellPrice - product.costPrice) * qty;

      totalAmount += subtotal;
      totalProfit += itemProfit;

      preparedItems.push({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: qty,
        costPrice: product.costPrice,
        sellPrice: product.sellPrice,
        subtotal,
      });
    }

    const parsedPayment =
      paymentMethod === "CASH" ? Number(paymentAmount) || 0 : totalAmount;

    if (paymentMethod === "CASH" && parsedPayment < totalAmount) {
      return NextResponse.json(
        { error: "Uang pembayaran kurang dari total belanja." },
        { status: 400 }
      );
    }

    const changeAmount = parsedPayment - totalAmount;
    const invoiceNumber = generateInvoiceNumber();

    const transaction = await prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          invoiceNumber,
          totalAmount,
          totalProfit,
          paymentAmount: parsedPayment,
          changeAmount,
          paymentMethod,
          customerName: customerName?.trim() || null,
          storeId: session.storeId,
          items: {
            create: preparedItems,
          },
        },
        include: {
          items: true,
        },
      });

      // Kurangi stok masing-masing barang dan catat di Kartu Stok (StockMovement)
      for (const item of preparedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            storeId: session.storeId,
            type: "OUT",
            quantity: -item.quantity,
            note: `Penjualan Kasir (${invoiceNumber})`,
          },
        });
      }

      return createdTx;
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("Create POS transaction error:", error);
    return NextResponse.json(
      { error: "Gagal memproses transaksi penjualan." },
      { status: 500 }
    );
  }
}

