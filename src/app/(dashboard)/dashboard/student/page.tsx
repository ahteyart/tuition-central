import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { StatCard } from "@/components/layout/stat-card";
import { BookOpen, ClipboardList, Trophy, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function StudentDashboard() {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") redirect("/login");

  const student = await db.student.findUnique({
    where: { userId: session.user.id },
    include: {
      branch: { select: { name: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          class: {
            include: {
              subject: { select: { name: true } },
              teacher: { include: { user: { select: { name: true } } } },
            },
          },
        },
      },
      points: { orderBy: { earnedAt: "desc" } },
      badges: { include: { badge: true } },
    },
  });

  if (!student) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>Student profile not found. Contact admin.</p>
      </div>
    );
  }

  const totalPoints = student.points.reduce((a, p) => a + p.points, 0);

  // Attendance rate (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalAtt, presentAtt] = await Promise.all([
    db.attendance.count({ where: { studentId: student.id, date: { gte: thirtyDaysAgo } } }),
    db.attendance.count({
      where: { studentId: student.id, date: { gte: thirtyDaysAgo }, status: "PRESENT" },
    }),
  ]);
  const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

  // Pending homework
  const pendingHomework = await db.homework.count({
    where: {
      class: {
        enrollments: { some: { studentId: student.id, status: "ACTIVE" } },
      },
      dueDate: { gte: new Date() },
      submissions: { none: { studentId: student.id } },
    },
  });

  // Recent results
  const recentResults = await db.examResult.findMany({
    where: { studentId: student.id },
    orderBy: { examDate: "desc" },
    take: 5,
  });

  const today = new Date().getDay();
  const todayClasses = student.enrollments.filter(
    (e) => e.class.dayOfWeek === today
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {session.user.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-sm text-gray-500">
          {student.branch.name}
          {student.formLevel ? ` · ${student.formLevel}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Classes" value={student.enrollments.length} icon={BookOpen} color="blue" />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={ClipboardList}
          color={attendanceRate >= 80 ? "green" : attendanceRate >= 60 ? "amber" : "red"}
        />
        <StatCard title="My Points" value={totalPoints} icon={Trophy} color="amber" />
        <StatCard title="Homework Due" value={pendingHomework} icon={FileText} color="red" />
      </div>

      {/* Today's classes */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Today&apos;s Classes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {todayClasses.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">No classes today 🎉</p>
          ) : (
            todayClasses.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                <div className="text-center w-16">
                  <p className="text-xs text-blue-600 font-semibold">{e.class.timeStart}</p>
                  <p className="text-xs text-gray-300">—</p>
                  <p className="text-xs text-gray-400">{e.class.timeEnd}</p>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{e.class.subject.name}</p>
                  <p className="text-sm text-gray-500">
                    {e.class.teacher.user.name}
                    {e.class.room ? ` · Room ${e.class.room}` : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent results */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Results</h2>
            <Link href="/results">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentResults.length === 0 ? (
              <p className="p-5 text-center text-gray-400 text-sm">No results yet</p>
            ) : (
              recentResults.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{r.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.examDate).toLocaleDateString("en-MY")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-blue-700">
                      {r.score}/{r.maxScore}
                    </p>
                    <p className="text-xs text-gray-400">
                      {Math.round((r.score / r.maxScore) * 100)}%
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Badges Earned
            </h2>
          </div>
          <div className="p-5">
            {student.badges.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">
                No badges yet. Keep attending classes to earn them!
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {student.badges.map((sb) => (
                  <div
                    key={sb.id}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-amber-50 border border-amber-100"
                  >
                    <span className="text-2xl">{sb.badge.iconUrl ?? "🏅"}</span>
                    <p className="text-xs font-medium text-amber-800">{sb.badge.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
