"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notifications";
import { formatDate } from "@/lib/utils";
import { generateAIHomeworkFeedback } from "@/lib/gemini";

async function assertTeacherOrAdmin() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createHomework(formData: FormData): Promise<void> {
  await assertTeacherOrAdmin();

  const classId = formData.get("classId") as string;
  const title = (formData.get("title") as string).trim();
  const description = (formData.get("description") as string).trim();
  const dueDate = new Date(formData.get("dueDate") as string);

  if (!classId || !title) throw new Error("Class and title are required.");

  const hw = await db.homework.create({
    data: { classId, title, description: description || null, dueDate },
  });

  // Notify enrolled students
  const enrollments = await db.enrollment.findMany({
    where: { classId, status: "ACTIVE" },
    include: { student: { include: { user: { select: { id: true } } } } },
  });
  for (const e of enrollments) {
    await createNotification(
      e.student.user.id,
      "HOMEWORK_DUE",
      `New assignment: ${title}`,
      `Due: ${formatDate(dueDate)}. Check the homework section for details.`
    );
  }

  revalidatePath("/homework");
  redirect(`/homework/${hw.id}`);
}

export async function submitHomework(homeworkId: string, studentId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") throw new Error("Unauthorized");

  const note = (formData.get("note") as string | null)?.trim() ?? null;

  await db.homeworkSubmission.upsert({
    where: { homeworkId_studentId: { homeworkId, studentId } },
    create: { homeworkId, studentId, teacherNote: note },
    update: { teacherNote: note, submittedAt: new Date() },
  });

  revalidatePath(`/homework/${homeworkId}`);
}

export async function gradeSubmission(
  submissionId: string,
  homeworkId: string,
  formData: FormData
): Promise<void> {
  await assertTeacherOrAdmin();

  const score = parseFloat(formData.get("score") as string);
  const feedback = (formData.get("feedback") as string | null)?.trim() ?? null;

  await db.homeworkSubmission.update({
    where: { id: submissionId },
    data: {
      score: isNaN(score) ? null : score,
      aiFeedback: feedback,
      reviewedAt: new Date(),
    },
  });

  revalidatePath(`/homework/${homeworkId}`);
}

export async function generateAiFeedback(submissionId: string, homeworkId: string): Promise<void> {
  await assertTeacherOrAdmin();

  const submission = await db.homeworkSubmission.findUnique({
    where: { id: submissionId },
    include: { homework: { select: { title: true, description: true } } },
  });
  if (!submission) throw new Error("Submission not found");

  const feedback = await generateAIHomeworkFeedback(
    submission.homework.title,
    submission.homework.description,
    submission.teacherNote
  );

  await db.homeworkSubmission.update({
    where: { id: submissionId },
    data: { aiFeedback: feedback, reviewedAt: new Date() },
  });

  revalidatePath(`/homework/${homeworkId}`);
}

export async function deleteHomework(homeworkId: string): Promise<void> {
  await assertTeacherOrAdmin();
  await db.homework.delete({ where: { id: homeworkId } });
  revalidatePath("/homework");
  redirect("/homework");
}
