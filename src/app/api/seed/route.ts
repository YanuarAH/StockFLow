import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Akun demo tidak tersedia setelah migrasi ke Supabase Auth." },
    { status: 410 }
  );
}
