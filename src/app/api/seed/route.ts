import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";

export async function POST() {
  try {
    const demoEmail = "demo@tokoberkah.id";

    let user = await prisma.user.findUnique({
      where: { email: demoEmail },
      include: { stores: true },
    });

    if (!user) {
      const passwordHash = await bcrypt.hash("demo12345", 10);

      user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name: "Budi Santoso",
            email: demoEmail,
            passwordHash,
          },
        });

        const store = await tx.store.create({
          data: {
            name: "Toko Sembako & Kelontong Berkah",
            address: "Jl. Merdeka Raya No. 45, Surabaya",
            phone: "0812-3456-7890",
            ownerId: createdUser.id,
          },
        });

        const catSembako = await tx.category.create({
          data: { name: "Sembako", storeId: store.id },
        });
        const catMinuman = await tx.category.create({
          data: { name: "Minuman", storeId: store.id },
        });
        const catMakanan = await tx.category.create({
          data: { name: "Makanan Ringan", storeId: store.id },
        });
        const catKebutuhan = await tx.category.create({
          data: { name: "Kebutuhan Rumah", storeId: store.id },
        });

        const sampleProducts = [
          {
            sku: "SMB-001",
            name: "Beras Ramos Premium 5kg",
            categoryId: catSembako.id,
            unit: "sak",
            costPrice: 64000,
            sellPrice: 72000,
            stock: 18,
            minStock: 5,
          },
          {
            sku: "SMB-002",
            name: "Minyak Goreng Tropical 2L",
            categoryId: catSembako.id,
            unit: "pouch",
            costPrice: 31500,
            sellPrice: 36000,
            stock: 4, // Stok menipis
            minStock: 10,
          },
          {
            sku: "SMB-003",
            name: "Gula Pasir Gulaku 1kg",
            categoryId: catSembako.id,
            unit: "pcs",
            costPrice: 15500,
            sellPrice: 18000,
            stock: 25,
            minStock: 8,
          },
          {
            sku: "MNM-001",
            name: "Kopi Kapal Api Special Mix (Renceng)",
            categoryId: catMinuman.id,
            unit: "renceng",
            costPrice: 12500,
            sellPrice: 15000,
            stock: 3, // Stok menipis
            minStock: 6,
          },
          {
            sku: "MNM-002",
            name: "Teh Pucuk Harum 350ml",
            categoryId: catMinuman.id,
            unit: "botol",
            costPrice: 2800,
            sellPrice: 4000,
            stock: 42,
            minStock: 12,
          },
          {
            sku: "MKN-001",
            name: "Indomie Goreng Spesial",
            categoryId: catMakanan.id,
            unit: "bungkus",
            costPrice: 2700,
            sellPrice: 3500,
            stock: 85,
            minStock: 20,
          },
          {
            sku: "KBT-001",
            name: "Sabun Cuci Piring Sunlight 650ml",
            categoryId: catKebutuhan.id,
            unit: "pouch",
            costPrice: 11000,
            sellPrice: 14000,
            stock: 2, // Stok menipis
            minStock: 5,
          },
        ];

        const createdProducts = [];
        for (const p of sampleProducts) {
          const prod = await tx.product.create({
            data: {
              ...p,
              storeId: store.id,
            },
          });
          createdProducts.push(prod);

          await tx.stockMovement.create({
            data: {
              productId: prod.id,
              storeId: store.id,
              type: "IN",
              quantity: prod.stock,
              note: "Stok awal pembukaan toko",
            },
          });
        }

        // Buat 2 contoh transaksi penjualan hari ini
        const tx1Items = [
          {
            productId: createdProducts[0].id,
            productName: createdProducts[0].name,
            unit: createdProducts[0].unit,
            quantity: 1,
            costPrice: createdProducts[0].costPrice,
            sellPrice: createdProducts[0].sellPrice,
            subtotal: createdProducts[0].sellPrice * 1,
          },
          {
            productId: createdProducts[5].id,
            productName: createdProducts[5].name,
            unit: createdProducts[5].unit,
            quantity: 10,
            costPrice: createdProducts[5].costPrice,
            sellPrice: createdProducts[5].sellPrice,
            subtotal: createdProducts[5].sellPrice * 10,
          },
        ];

        const tx1Total = 72000 + 35000;
        const tx1Profit = (72000 - 64000) * 1 + (3500 - 2700) * 10;

        await tx.transaction.create({
          data: {
            invoiceNumber: generateInvoiceNumber(),
            totalAmount: tx1Total,
            totalProfit: tx1Profit,
            paymentAmount: 110000,
            changeAmount: 3000,
            paymentMethod: "CASH",
            customerName: "Ibu Rina",
            storeId: store.id,
            items: { create: tx1Items },
          },
        });

        const tx2Total = 18000 * 2 + 4000 * 5;
        const tx2Profit = (18000 - 15500) * 2 + (4000 - 2800) * 5;

        await tx.transaction.create({
          data: {
            invoiceNumber: generateInvoiceNumber(),
            totalAmount: tx2Total,
            totalProfit: tx2Profit,
            paymentAmount: tx2Total,
            changeAmount: 0,
            paymentMethod: "QRIS",
            customerName: "Pak Hendra",
            storeId: store.id,
            items: {
              create: [
                {
                  productId: createdProducts[2].id,
                  productName: createdProducts[2].name,
                  unit: createdProducts[2].unit,
                  quantity: 2,
                  costPrice: createdProducts[2].costPrice,
                  sellPrice: createdProducts[2].sellPrice,
                  subtotal: 36000,
                },
                {
                  productId: createdProducts[4].id,
                  productName: createdProducts[4].name,
                  unit: createdProducts[4].unit,
                  quantity: 5,
                  costPrice: createdProducts[4].costPrice,
                  sellPrice: createdProducts[4].sellPrice,
                  subtotal: 20000,
                },
              ],
            },
          },
        });

        return await tx.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          include: { stores: true },
        });
      });
    }

    const store = user.stores[0];
    const token = await createSessionToken({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      storeId: store.id,
      storeName: store.name,
    });

    const response = NextResponse.json({
      message: "Berhasil masuk ke Akun Demo UMKM!",
      store,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Seed demo error:", error);
    return NextResponse.json(
      {
        error:
          "Gagal menyiapkan data demo. Pastikan database PostgreSQL sudah terhubung dan tabel sudah dibuat.",
      },
      { status: 500 }
    );
  }
}

