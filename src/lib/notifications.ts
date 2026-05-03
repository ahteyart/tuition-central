import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  content: string
): Promise<void> {
  try {
    await db.notification.create({ data: { userId, type, title, content } });
  } catch {
    // Never let notification failures break the calling action
  }
}

export async function notifyParentsOfStudent(
  studentId: string,
  type: NotificationType,
  title: string,
  content: string
): Promise<void> {
  try {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { parents: { include: { user: { select: { id: true } } } } },
    });
    if (!student) return;
    await Promise.all(
      student.parents.map(p => createNotification(p.user.id, type, title, content))
    );
  } catch {
    // Silent
  }
}
