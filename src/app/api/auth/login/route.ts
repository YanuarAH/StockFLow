import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    let authUser = data.user;

    if (error || !authUser) {
      const legacyUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { stores: { orderBy: { createdAt: "asc" } } },
      });

      if (
        !legacyUser ||
        legacyUser.supabaseUserId ||
        !legacyUser.passwordHash ||
        !(await bcrypt.compare(password, legacyUser.passwordHash))
      ) {
        return NextResponse.json(
          { error: "Email atau password salah." },
          { status: 401 }
        );
      }

      const store = legacyUser.stores[0];
      const { data: migrationData, error: migrationError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: legacyUser.name,
              storeName: store?.name ?? `Toko ${legacyUser.name}`,
              storeAddress: store?.address ?? "",
              storePhone: store?.phone ?? "",
            },
            emailRedirectTo: new URL(
              "/auth/callback?next=/dashboard",
              request.url
            ).toString(),
          },
        });

      if (migrationError || !migrationData.user) {
        console.error("Legacy account migration error:", migrationError);
        return NextResponse.json(
          { error: "Akun lama belum dapat dipindahkan ke Supabase Auth." },
          { status: 500 }
        );
      }

      if (!migrationData.session) {
        return NextResponse.json({
          message: "Periksa email Anda untuk mengonfirmasi pemindahan akun.",
          requiresEmailConfirmation: true,
        });
      }

      authUser = migrationData.user;
    }

    let profile;
    try {
      profile = await ensureUserProfile(authUser);
    } catch (profileError) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("Login profile sign-out error:", signOutError);
      }
      throw profileError;
    }

    const activeStore = profile.stores[0];
    if (!activeStore) {
      throw new Error("Authenticated user has no associated store.");
    }

    return NextResponse.json({
      message: "Login berhasil!",
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      },
      store: {
        id: activeStore.id,
        name: activeStore.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Gagal masuk. Periksa koneksi Supabase dan database." },
      { status: 500 }
    );
  }
}
