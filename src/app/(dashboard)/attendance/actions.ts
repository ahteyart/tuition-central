"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { notifyParentsOfStudent } from "@/lib/notifications";

export async function markAttendance(
  classId: string,
  date: string,
  records: Array<{ studentId: string; status: "PRESENT" | "ABSENT" | "LATE" }>
): Promise<void> {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const attendanceDate = new Date(date);

  const cls = await db.class.findUnique({
    where: { id: classId },
    select: { name: true, subject: { select: { name: true } } },
  });

  await Promise.all(
    records.map(r =>
      db.attendance.upsert({
        where: { studentId_classId_date: { studentId: r.studentId, classId, date: attendanceDate } },
        update: { status: r.status, notedBy: session.user.id },
        create: { studentId: r.studentId, classId, date: attendanceDate, status: r.status, notedBy: session.user.id },
      })
    )
  );

  // Award points for present students
  const presentStudents = records.filter(r => r.status === "PRESENT");
  for (const r of presentStudents) {
    await db.studentPoint.create({
      data: { studentId: r.studentId, points: 5, reason: `Attendance on ${date}` },
    }).catch(() => {});
  }

  // Notify parents of absent students
  const absentStudents = records.filter(r => r.status === "ABSENT");
  for (const r of absentStudents) {
    const student = await db.student.findUnique({
      where: { id: r.studentId },
      include: { user: { select: { name: true } } },
    });
    if (student && cls) {
      await notifyParentsOfStudent(
        r.studentId,
        "ABSENT_ALERT",
        `${student.user.name} was absent`,
        `${student.user.name} was marked absent from ${cls.subject.name} (${cls.name}) on ${date}.`
      );
    }
  }

  revalidatePath("/attendance");
}

export async function markAttendanceForm(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const classId = formData.get("classId") as string;
  const date = formData.get("date") as string;

  const studentIds = formData.getAll("studentId") as string[];
  const records = studentIds.map(id => ({
    studentId: id,
    status: (formData.get(`status_${id}`) ?? "ABSENT") as "PRESENT" | "ABSENT" | "LATE",
  }));

  await markAttendance(classId, date, records);
}
