import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Clock, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function HomeworkPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let homework: any[] = [];

  if (session.user.role === "STUDENT") {
    const student = await db.student.findUnique({
      where: { userId: session.user.id },
      include: { enrollments: { where: { status: "ACTIVE" }, select: { classId: true } } },
    });
    if (!student) redirect("/dashboard/student");

    const classIds = student.enrollments.map(e => e.classId);
    homework = await db.homework.findMany({
      where: { classId: { in: classIds } },
      include: {
        class: { select: { name: true, subject: { select: { name: true } } } },
        submissions: { where: { studentId: student.id }, select: { id: true, score: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  } else if (session.user.role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId: session.user.id },
      include: {
        children: {
          include: { enrollments: { where: { status: "ACTIVE" }, select: { classId: true } } },
        },
      },
    });
    if (!parent) redirect("/dashboard/parent");

    const classIds = parent.children.flatMap(c => c.enrollments.map(e => e.classId));
    homework = await db.homework.findMany({
      where: { classId: { in: classIds } },
      include: {
        class: { select: { name: true, subject: { select: { name: true } } } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  } else if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) redirect("/dashboard/teacher");

    homework = await db.homework.findMany({
      where: { class: { teacherId: teacher.id } },
      include: {
        class: { select: { name: true, subject: { select: { name: true } } } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  } else {
    homework = await db.homework.findMany({
      include: {
        class: {
          select: {
            name: true,
            subject: { select: { name: true } },
            branch: { select: { name: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 200,
    });
  }

  const canCreate = ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role);
  const isStudent = session.user.role === "STUDENT";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-700" /> Homework
          </h1>
          <p className="text-sm text-gray-500 mt-1">{homework.length} assignment{homework.length !== 1 ? "s" : ""}</p>
        </div>
        {canCreate && (
          <Link href="/homework/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Assignment</Button>
          </Link>
        )}
      </div>

      {homework.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No assignments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {homework.map((hw: any) => {
            const isOverdue = new Date(hw.dueDate) < today;
            const submitted = isStudent && hw.submissions?.length > 0;
            return (
              <Link key={hw.id} href={`/homework/${hw.id}`}>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    submitted ? "bg-green-100" : isOverdue ? "bg-red-100" : "bg-blue-100"
                  }`}>
                    {submitted
                      ? <CheckCircle className="h-5 w-5 text-green-600" />
                      : <BookOpen className={`h-5 w-5 ${isOverdue ? "text-red-500" : "text-blue-600"}`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{hw.title}</p>
                    <p className="text-sm text-gray-500">
                      {hw.class.subject.name} · {hw.class.name}
                      {hw.class.branch && <span className="text-blue-500"> · {hw.class.branch.name}</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(hw.dueDate)}
                    </div>
                    {isStudent && submitted && hw.submissions[0].score != null && (
                      <Badge variant="success">{hw.submissions[0].score} pts</Badge>
                    )}
                    {!isStudent && (
                      <span className="text-xs text-gray-400">{hw._count.submissions} submitted</span>
                    )}
                    {isOverdue && !submitted && <Badge variant="danger">Overdue</Badge>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
