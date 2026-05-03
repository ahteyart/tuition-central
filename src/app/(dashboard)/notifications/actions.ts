"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markAllRead(): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await db.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}

export async function markOneRead(notificationId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await db.notification.update({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}
