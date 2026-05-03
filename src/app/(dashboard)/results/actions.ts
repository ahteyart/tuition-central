"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function assertTeacherOrAdmin() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createExamResult(formData: FormData): Promise<void> {
  await assertTeacherOrAdmin();

  const studentId = formData.get("studentId") as string;
  const classId = formData.get("classId") as string;
  const title = (formData.get("title") as string).trim();
  const score = parseFloat(formData.get("score") as string);
  const maxScore = parseFloat(formData.get("maxScore") as string) || 100;
  const examDate = new Date(formData.get("examDate") as string);

  if (!studentId || !classId || !title) throw new Error("Student, class, and title are required.");
  if (isNaN(score)) throw new Error("Score must be a number.");
  if (score < 0 || score > maxScore) throw new Error(`Score must be between 0 and ${maxScore}.`);

  await db.examResult.create({
    data: { studentId, classId, title, score, maxScore, examDate },
  });

  revalidatePath("/results");
  redirect("/results");
}

export async function deleteExamResult(resultId: string): Promise<void> {
  await assertTeacherOrAdmin();
  await db.examResult.delete({ where: { id: resultId } });
  revalidatePath("/results");
}
