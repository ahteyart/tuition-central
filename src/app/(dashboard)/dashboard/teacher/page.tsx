import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { StatCard } from "@/components/layout/stat-card";
import { BookOpen, Users, ClipboardList, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function TeacherDashboard() {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") redirect("/login");

  const teacher = await db.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      classes: {
        where: { isActive: true },
        include: {
          subject: { select: { name: true } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { timeStart: "asc" }],
      },
    },
  });

  if (!teacher) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>Teacher profile not found. Contact admin.</p>
      </div>
    );
  }

  const today = new Date().getDay();
  const todayClasses = teacher.classes.filter((c) => c.dayOfWeek === today);

  const pendingHomework = await db.homeworkSubmission.count({
    where: {
      homework: { class: { teacherId: teacher.id } },
      reviewedAt: null,
      fileUrl: { not: null },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome, {session.user.name}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Classes" value={teacher.classes.length} icon={BookOpen} color="blue" />
        <StatCard
          title="Today's Classes"
          value={todayClasses.length}
          icon={ClipboardList}
          color="green"
        />
        <StatCard
          title="Pending Reviews"
          value={pendingHomework}
          icon={FileText}
          color="amber"
        />
        <StatCard
          title="Total Students"
          value={teacher.classes.reduce((a, c) => a + c._count.enrollments, 0)}
          icon={Users}
          color="blue"
        />
      </div>

      {/* Today's schedule */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Today&apos;s Schedule</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {todayClasses.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">No classes today</p>
          ) : (
            todayClasses.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                <div className="text-center w-16">
                  <p className="text-xs text-gray-400">{c.timeStart}</p>
                  <p className="text-xs text-gray-300">—</p>
                  <p className="text-xs text-gray-400">{c.timeEnd}</p>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.subject.name}</p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{c._count.enrollments} students</Badge>
                  {c.room && <p className="text-xs text-gray-400 mt-1">Room {c.room}</p>}
                </div>
                <Link href={`/attendance?classId=${c.id}`}>
                  <Button size="sm" className="gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Mark
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* All classes */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All My Classes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {teacher.classes.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-sm text-gray-500">
                  {c.subject.name} · {dayNames[c.dayOfWeek ?? 0]} {c.timeStart}–{c.timeEnd}
                </p>
              </div>
              <Badge variant="secondary">{c._count.enrollments} students</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
