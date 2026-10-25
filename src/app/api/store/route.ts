import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await prisma.store.findFirst({
    where: { id: session.storeId, ownerId: session.userId },
  });

  return NextResponse.json({
    session,
    store,
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { storeName, address, phone, ownerName } = body;

    if (!storeName || !storeName.trim()) {
      return NextResponse.json(
        { error: "Nama toko tidak boleh kosong." },
        { status: 400 }
      );
    }

    const updatedStore = await prisma.store.update({
      where: { id: session.storeId },
      data: {
        name: storeName.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
      },
    });

    if (ownerName && ownerName.trim()) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { name: ownerName.trim() },
      });
    }

    return NextResponse.json({
      message: "Profil toko berhasil diperbarui.",
      store: updatedStore,
    });
  } catch (error) {
    console.error("Update store error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui profil toko." },
      { status: 500 }
    );
  }
}
