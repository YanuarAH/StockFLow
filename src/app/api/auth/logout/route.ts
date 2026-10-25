import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }

    return NextResponse.json({ message: "Berhasil keluar" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Gagal mengakhiri sesi. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
