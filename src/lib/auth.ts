import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const defaultCategories = [
  "Makanan & Camilan",
  "Minuman",
  "Sembako & Kebutuhan Pokok",
  "Lainnya",
];

export interface SessionPayload {
  userId: string;
  userName: string;
  userEmail: string;
  storeId: string;
  storeName: string;
}

function metadataString(user: SupabaseUser, key: string) {
  const value = user.user_metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function ensureUserProfile(authUser: SupabaseUser) {
  const email = authUser.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("The authenticated Supabase user does not have an email.");
  }

  const name = metadataString(authUser, "name") ?? email.split("@")[0];
  const storeName = metadataString(authUser, "storeName") ?? `Toko ${name}`;
  const storeAddress = metadataString(authUser, "storeAddress") ?? null;
  const storePhone = metadataString(authUser, "storePhone") ?? null;

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({
      where: { supabaseUserId: authUser.id },
      include: { stores: { orderBy: { createdAt: "asc" } } },
    });

    if (!user) {
      const existingUser = await tx.user.findUnique({
        where: { email },
        include: { stores: { orderBy: { createdAt: "asc" } } },
      });

      if (existingUser?.supabaseUserId && existingUser.supabaseUserId !== authUser.id) {
        throw new Error("This email is already linked to another Supabase account.");
      }

      if (existingUser && !authUser.email_confirmed_at) {
        throw new Error("Confirm this email before linking it to existing store data.");
      }

      user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: { supabaseUserId: authUser.id, passwordHash: null },
            include: { stores: { orderBy: { createdAt: "asc" } } },
          })
        : await tx.user.create({
            data: {
              supabaseUserId: authUser.id,
              name,
              email,
              passwordHash: null,
            },
            include: { stores: { orderBy: { createdAt: "asc" } } },
          });
    }

    if (user.stores.length === 0) {
      const store = await tx.store.create({
        data: {
          name: storeName,
          address: storeAddress,
          phone: storePhone,
          ownerId: user.id,
        },
      });

      await tx.category.createMany({
        data: defaultCategories.map((categoryName) => ({
          name: categoryName,
          storeId: store.id,
        })),
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { stores: { orderBy: { createdAt: "asc" } } },
    });
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  const userId = data?.claims.sub;
  if (!userId) {
    if (error && error.name !== "AuthSessionMissingError") {
      throw error;
    }
    return null;
  }

  const profile = await prisma.user.findUnique({
    where: { supabaseUserId: userId },
    include: { stores: { orderBy: { createdAt: "asc" } } },
  });
  const store = profile?.stores[0];

  if (!profile || !store) {
    return null;
  }

  return {
    userId: profile.id,
    userName: profile.name,
    userEmail: profile.email,
    storeId: store.id,
    storeName: store.name,
  };
}
