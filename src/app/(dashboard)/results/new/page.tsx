import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { createExamResult } from "../actions";

export default async function NewResultPage() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect("/results");
  }

  let classFilter: object = { isActive: true };
  if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } });
    if (teacher) classFilter = { ...classFilter, teacherId: teacher.id };
  } else if (session.user.role === "CENTRE_ADMIN") {
    const ba = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
    if (ba) classFilter = { ...classFilter, branchId: ba.branchId };
  }

  const classes = await db.class.findMany({
    where: classFilter,
    include: {
      subject: { select: { name: true } },
      branch: { select: { name: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { student: { include: { user: { select: { name: true } } } } },
        orderBy: { student: { user: { name: "asc" } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/results">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-blue-700" /> Add Result
          </h1>
        </div>
      </div>

      <form action={createExamResult} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Class *</label>
          <select name="classId" required
            className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
            <option value="">Select class…</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.subject.name} ({c.branch.name})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Student *</label>
          <select name="studentId" required
            className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
            <option value="">Select student…</option>
            {classes.flatMap(c =>
              c.enrollments.map(e => (
                <option key={`${c.id}-${e.student.id}`} value={e.student.id}>
                  {e.student.user.name} ({c.name})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Exam / Assessment Title *</label>
          <input name="title" required placeholder="e.g. Mid-Year Exam 2025"
            className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Score *</label>
            <input type="number" name="score" required min="0" step="0.5" placeholder="0"
              className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Max Score</label>
            <input type="number" name="maxScore" min="1" defaultValue="100" step="0.5"
              className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Exam Date *</label>
          <input type="date" name="examDate" required defaultValue={today}
            className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/results" className="flex-1">
            <Button variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1">Save Result</Button>
        </div>
      </form>
    </div>
  );
}
