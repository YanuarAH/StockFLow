import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, storeName, storeAddress, storePhone } = body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof storeName !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password ||
      !storeName.trim()
    ) {
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
    if (existingUser?.passwordHash && !existingUser.supabaseUserId) {
      return NextResponse.json(
        {
          error:
            "Email ini sudah memiliki akun toko. Masuk dengan password lama untuk memindahkannya ke Supabase Auth.",
        },
        { status: 409 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: name.trim(),
          storeName: storeName.trim(),
          storeAddress:
            typeof storeAddress === "string" ? storeAddress.trim() : "",
          storePhone: typeof storePhone === "string" ? storePhone.trim() : "",
        },
        emailRedirectTo: new URL(
          "/auth/callback?next=/dashboard",
          request.url
        ).toString(),
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Pendaftaran Supabase gagal." },
        { status: 400 }
      );
    }

    if (!data.session) {
      return NextResponse.json({
        message: "Periksa email Anda untuk mengonfirmasi pendaftaran.",
        requiresEmailConfirmation: true,
      });
    }

    let profile;
    try {
      profile = await ensureUserProfile(data.user);
    } catch (profileError) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("Registration profile sign-out error:", signOutError);
      }
      throw profileError;
    }

    const store = profile.stores[0];
    if (!store) {
      throw new Error("Newly registered user has no associated store.");
    }

    return NextResponse.json({
      message: "Pendaftaran toko berhasil!",
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      },
      store: {
        id: store.id,
        name: store.name,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      {
        error:
          "Gagal mendaftarkan akun. Periksa koneksi Supabase dan database.",
      },
      { status: 500 }
    );
  }
}
