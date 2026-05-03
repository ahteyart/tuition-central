"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function sendMessage(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const recipientType = formData.get("recipientType") as string;
  const recipientId = formData.get("recipientId") as string;
  const content = (formData.get("content") as string).trim();

  if (!content) throw new Error("Message cannot be empty.");
  if (!recipientType) throw new Error("Recipient type is required.");

  await db.message.create({
    data: {
      senderId: session.user.id,
      recipientType,
      recipientId: recipientId || null,
      content,
    },
  });

  revalidatePath("/messages");
}

export async function markMessageRead(messageId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await db.message.update({
    where: { id: messageId },
    data: { isRead: true },
  });

  revalidatePath("/messages");
}
