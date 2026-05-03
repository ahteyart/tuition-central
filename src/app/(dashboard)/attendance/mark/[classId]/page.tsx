import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList, Check, X, Clock } from "lucide-react";
import Link from "next/link";
import { markAttendanceForm } from "../../actions";

export default async function MarkAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect("/attendance");
  }

  const { classId } = await params;
  const sp = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const date = sp.date ?? today;

  const cls = await db.class.findUnique({
    where: { id: classId },
    include: {
      subject: { select: { name: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { student: { include: { user: { select: { name: true } } } } },
        orderBy: { student: { user: { name: "asc" } } },
      },
    },
  });

  if (!cls) notFound();

  // Load existing attendance for this date
  const existing = await db.attendance.findMany({
    where: { classId, date: new Date(date) },
  });
  const existingMap = Object.fromEntries(existing.map(a => [a.studentId, a.status]));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/attendance"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-700" /> Mark Attendance
          </h1>
          <p className="text-sm text-gray-500">{cls.name} – {cls.subject.name}</p>
        </div>
      </div>

      <form action={markAttendanceForm} className="space-y-4">
        <input type="hidden" name="classId" value={classId} />

        {/* Date picker */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Session Date</label>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <span className="text-sm text-gray-500">{cls.enrollments.length} students</span>
        </div>

        {/* Quick-mark all buttons */}
        <div className="flex gap-2">
          <span className="text-sm text-gray-500 self-center">Quick mark:</span>
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 font-medium"
            onClick={undefined}
            formNoValidate
            id="mark-all-present"
          >
            ✓ All Present
          </button>
        </div>

        {cls.enrollments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No active students enrolled in this class.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 grid grid-cols-[1fr_auto] text-sm font-semibold text-gray-600">
              <span>Student</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-gray-100">
              {cls.enrollments.map((e, idx) => {
                const current = existingMap[e.student.id] ?? "PRESENT";
                return (
                  <div key={e.student.id} className="flex items-center gap-4 px-4 py-3">
                    <input type="hidden" name="studentId" value={e.student.id} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{e.student.user.name}</p>
                    </div>
                    <div className="flex gap-1">
                      {(["PRESENT", "LATE", "ABSENT"] as const).map(s => (
                        <label
                          key={s}
                          className="cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`status_${e.student.id}`}
                            value={s}
                            defaultChecked={current === s}
                            className="sr-only peer"
                          />
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors peer-checked:ring-2 ${
                            s === "PRESENT"
                              ? "border-green-200 text-green-700 bg-green-50 peer-checked:ring-green-400 peer-checked:bg-green-100"
                              : s === "LATE"
                              ? "border-amber-200 text-amber-700 bg-amber-50 peer-checked:ring-amber-400 peer-checked:bg-amber-100"
                              : "border-red-200 text-red-700 bg-red-50 peer-checked:ring-red-400 peer-checked:bg-red-100"
                          }`}>
                            {s === "PRESENT" ? <Check className="h-3 w-3" /> : s === "LATE" ? <Clock className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {s === "PRESENT" ? "P" : s === "LATE" ? "L" : "A"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/attendance" className="flex-1">
            <Button variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1">Save Attendance</Button>
        </div>
      </form>
    </div>
  );
}
