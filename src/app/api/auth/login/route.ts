import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        stores: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 }
      );
    }

    let activeStore = user.stores[0];
    if (!activeStore) {
      activeStore = await prisma.store.create({
        data: {
          name: `Toko ${user.name}`,
          ownerId: user.id,
        },
      });
    }

    const token = await createSessionToken({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      storeId: activeStore.id,
      storeName: activeStore.name,
    });

    const response = NextResponse.json({
      message: "Login berhasil!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      store: {
        id: activeStore.id,
        name: activeStore.name,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error:
          "Gagal masuk. Pastikan database PostgreSQL sudah berjalan dan terkonfigurasi.",
      },
      { status: 500 }
    );
  }
}

