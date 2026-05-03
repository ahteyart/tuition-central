import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { createHomework } from "../actions";

export default async function NewHomeworkPage() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect("/homework");
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
    },
    orderBy: { name: "asc" },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const defaultDue = tomorrow.toISOString().split("T")[0];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/homework">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-700" /> Create Assignment
          </h1>
        </div>
      </div>

      <form action={createHomework} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
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
          <label className="text-sm font-medium text-gray-700">Title *</label>
          <input name="title" required placeholder="e.g. Chapter 5 Exercise"
            className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" rows={4}
            placeholder="Instructions, page numbers, questions to attempt…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Due Date *</label>
          <input type="date" name="dueDate" required defaultValue={defaultDue}
            className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/homework" className="flex-1">
            <Button variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1">Create Assignment</Button>
        </div>
      </form>
    </div>
  );
}
