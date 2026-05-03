"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const StudentSchema = z.object({
  // Student user
  studentName: z.string().min(2, "Name must be at least 2 characters"),
  studentEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  studentPhone: z.string().optional(),
  icNumber: z.string().optional(),
  school: z.string().optional(),
  formLevel: z.string().optional(),
  status: z.enum(["ACTIVE", "TRIAL", "INACTIVE", "GRADUATED"]).default("ACTIVE"),
  branchId: z.string().min(1, "Branch is required"),
  // Parent
  parentName: z.string().min(2, "Parent name is required"),
  parentEmail: z.string().email("Invalid parent email").optional().or(z.literal("")),
  parentPhone: z.string().optional(),
  relationship: z.string().default("Parent"),
});

export async function createStudent(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = StudentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Validation error");
  }

  const d = parsed.data;

  // Create student user + student profile
  const studentUser = await db.user.create({
    data: {
      name: d.studentName,
      email: d.studentEmail || null,
      phone: d.studentPhone || null,
      role: "STUDENT",
    },
  });

  const student = await db.student.create({
    data: {
      userId: studentUser.id,
      branchId: d.branchId,
      icNumber: d.icNumber || null,
      school: d.school || null,
      formLevel: d.formLevel || null,
      status: d.status,
    },
  });

  // Upsert parent user
  let parentUser = d.parentEmail
    ? await db.user.findFirst({ where: { email: d.parentEmail } })
    : d.parentPhone
    ? await db.user.findFirst({ where: { phone: d.parentPhone } })
    : null;

  if (!parentUser) {
    parentUser = await db.user.create({
      data: {
        name: d.parentName,
        email: d.parentEmail || null,
        phone: d.parentPhone || null,
        role: "PARENT",
      },
    });
  }

  // Upsert parent profile
  let parent = await db.parent.findUnique({ where: { userId: parentUser.id } });
  if (!parent) {
    parent = await db.parent.create({
      data: {
        userId: parentUser.id,
        relationship: d.relationship,
      },
    });
  }

  // Link parent to student
  await db.student.update({
    where: { id: student.id },
    data: { parents: { connect: { id: parent.id } } },
  });

  revalidatePath("/students");
  redirect("/students");
}

export async function updateStudentStatus(
  studentId: string,
  status: "ACTIVE" | "TRIAL" | "INACTIVE" | "GRADUATED"
) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  await db.student.update({ where: { id: studentId }, data: { status } });
  revalidatePath("/students");
}
