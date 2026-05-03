"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const ClassSchema = z.object({
  name: z.string().min(2, "Class name required"),
  branchId: z.string().min(1, "Branch required"),
  subjectId: z.string().min(1, "Subject required"),
  teacherId: z.string().min(1, "Teacher required"),
  room: z.string().optional(),
  capacity: z.coerce.number().int().min(1).max(100).default(30),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  timeStart: z.string().min(1, "Start time required"),
  timeEnd: z.string().min(1, "End time required"),
  feeAmount: z.coerce.number().min(0).default(0),
});

async function assertAdminAccess() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createClass(formData: FormData): Promise<void> {
  await assertAdminAccess();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ClassSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await db.class.create({ data: { ...parsed.data, room: parsed.data.room || null } });
  revalidatePath("/classes");
  redirect("/classes");
}

export async function updateClass(id: string, formData: FormData): Promise<void> {
  await assertAdminAccess();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ClassSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await db.class.update({ where: { id }, data: { ...parsed.data, room: parsed.data.room || null } });
  revalidatePath("/classes");
  redirect("/classes");
}

export async function toggleClassStatus(id: string, isActive: boolean): Promise<void> {
  await assertAdminAccess();
  await db.class.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath("/classes");
}

export async function enrollStudent(classId: string, studentId: string): Promise<void> {
  await assertAdminAccess();

  const cls = await db.class.findUnique({
    where: { id: classId },
    include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
  });
  if (!cls) throw new Error("Class not found");

  const status = cls._count.enrollments >= cls.capacity ? "WAITLIST" : "ACTIVE";

  await db.enrollment.upsert({
    where: { studentId_classId: { studentId, classId } },
    update: { status },
    create: { studentId, classId, status },
  });
  revalidatePath(`/classes/${classId}`);
}

export async function unenrollStudent(enrollmentId: string, classId: string): Promise<void> {
  await assertAdminAccess();
  await db.enrollment.update({ where: { id: enrollmentId }, data: { status: "DROPPED" } });

  // Promote first waitlisted student
  const waitlisted = await db.enrollment.findFirst({
    where: { classId, status: "WAITLIST" },
    orderBy: { enrolledDate: "asc" },
  });
  if (waitlisted) {
    await db.enrollment.update({ where: { id: waitlisted.id }, data: { status: "ACTIVE" } });
  }
  revalidatePath(`/classes/${classId}`);
}
