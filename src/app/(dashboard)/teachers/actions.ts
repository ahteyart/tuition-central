"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

async function assertAdmin() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createTeacher(formData: FormData): Promise<void> {
  await assertAdmin();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const branchId = formData.get("branchId") as string;
  const qualification = formData.get("qualification") as string;
  const salaryType = (formData.get("salaryType") as string) || "MONTHLY";
  const salaryRate = parseFloat(formData.get("salaryRate") as string) || 0;
  const bio = formData.get("bio") as string;
  const subjectIds = formData.getAll("subjectIds") as string[];

  if (!name || !email || !branchId) throw new Error("Name, email, and branch are required.");

  const existing = await db.user.findFirst({ where: { email } });
  if (existing) throw new Error("A user with this email already exists.");

  const passwordHash = await bcrypt.hash("Teacher@123", 10);

  const user = await db.user.create({
    data: { name, email, phone: phone || null, passwordHash, role: "TEACHER" },
  });

  const teacher = await db.teacher.create({
    data: {
      userId: user.id,
      branchId,
      qualification: qualification || null,
      salaryType: salaryType as any,
      salaryRate,
      bio: bio || null,
    },
  });

  if (subjectIds.length > 0) {
    await db.teacherSubject.createMany({
      data: subjectIds.map(subjectId => ({ teacherId: teacher.id, subjectId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/teachers");
  redirect(`/teachers/${teacher.id}`);
}

export async function updateTeacher(teacherId: string, formData: FormData): Promise<void> {
  await assertAdmin();

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const qualification = formData.get("qualification") as string;
  const salaryType = (formData.get("salaryType") as string) || "MONTHLY";
  const salaryRate = parseFloat(formData.get("salaryRate") as string) || 0;
  const bio = formData.get("bio") as string;
  const subjectIds = formData.getAll("subjectIds") as string[];

  const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) throw new Error("Teacher not found");

  await db.user.update({
    where: { id: teacher.userId },
    data: { name, phone: phone || null },
  });

  await db.teacher.update({
    where: { id: teacherId },
    data: {
      qualification: qualification || null,
      salaryType: salaryType as any,
      salaryRate,
      bio: bio || null,
    },
  });

  await db.teacherSubject.deleteMany({ where: { teacherId } });
  if (subjectIds.length > 0) {
    await db.teacherSubject.createMany({
      data: subjectIds.map(subjectId => ({ teacherId, subjectId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/teachers");
  revalidatePath(`/teachers/${teacherId}`);
  redirect(`/teachers/${teacherId}`);
}

export async function toggleTeacherStatus(teacherId: string, isActive: boolean): Promise<void> {
  await assertAdmin();
  await db.teacher.update({ where: { id: teacherId }, data: { isActive } });
  revalidatePath("/teachers");
  revalidatePath(`/teachers/${teacherId}`);
}

export async function requestLeave(teacherId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const dateFrom = new Date(formData.get("dateFrom") as string);
  const dateTo = new Date(formData.get("dateTo") as string);
  const reason = (formData.get("reason") as string).trim();

  if (!reason) throw new Error("Reason is required");

  await db.leaveRequest.create({ data: { teacherId, dateFrom, dateTo, reason } });
  revalidatePath(`/teachers/${teacherId}`);
}

export async function reviewLeave(leaveId: string, status: "APPROVED" | "REJECTED"): Promise<void> {
  const session = await assertAdmin();
  await db.leaveRequest.update({
    where: { id: leaveId },
    data: { status, reviewedBy: session.user.id },
  });
  revalidatePath("/teachers");
}
