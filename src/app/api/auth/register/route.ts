import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, storeName, storeAddress, storePhone } = body;

    if (!name || !email || !password || !storeName) {
      return NextResponse.json(
        { error: "Nama lengkap, email, password, dan nama toko wajib diisi." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Silakan gunakan email lain atau login." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create User + Store + Default Categories in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
        },
      });

      const store = await tx.store.create({
        data: {
          name: storeName.trim(),
          address: storeAddress?.trim() || null,
          phone: storePhone?.trim() || null,
          ownerId: user.id,
        },
      });

      // Buat kategori awal agar UMKM langsung siap pakai
      await tx.category.createMany({
        data: [
          { name: "Makanan & Camilan", storeId: store.id },
          { name: "Minuman", storeId: store.id },
          { name: "Sembako & Kebutuhan Pokok", storeId: store.id },
          { name: "Lainnya", storeId: store.id },
        ],
      });

      return { user, store };
    });

    const token = await createSessionToken({
      userId: result.user.id,
      userName: result.user.name,
      userEmail: result.user.email,
      storeId: result.store.id,
      storeName: result.store.name,
    });

    const response = NextResponse.json({
      message: "Pendaftaran toko berhasil!",
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      store: {
        id: result.store.id,
        name: result.store.name,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      {
        error:
          "Gagal mendaftarkan akun. Pastikan koneksi database PostgreSQL sudah aktif.",
      },
      { status: 500 }
    );
  }
}

