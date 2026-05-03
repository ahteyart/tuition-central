import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, GraduationCap, Users, BookOpen, Trophy } from "lucide-react";
import Link from "next/link";

const statusColor = {
  ACTIVE: "success", TRIAL: "warning", INACTIVE: "secondary", GRADUATED: "default",
} as const;

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const student = await db.student.findUnique({
    where: { id },
    include: {
      user: true,
      branch: { select: { name: true } },
      parents: { include: { user: { select: { name: true, phone: true, email: true } } } },
      enrollments: {
        include: { class: { include: { subject: { select: { name: true } }, teacher: { include: { user: { select: { name: true } } } } } } },
      },
      invoices: { orderBy: { month: "desc" }, take: 6 },
      examResults: { orderBy: { examDate: "desc" }, take: 6 },
      points: { orderBy: { earnedAt: "desc" } },
    },
  });

  if (!student) notFound();

  const totalPoints = student.points.reduce((a, p) => a + p.points, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/students"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-blue-700" />{student.user.name}
          </h1>
          <p className="text-sm text-gray-500">{student.branch.name} · {student.formLevel} · {student.school}</p>
        </div>
        <Badge variant={statusColor[student.status]} className="ml-auto">
          {student.status.charAt(0) + student.status.slice(1).toLowerCase()}
        </Badge>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-500">IC Number</p>
          <p className="font-semibold mt-1">{student.icNumber ?? "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-500">Contact</p>
          <p className="font-semibold mt-1 text-sm">{student.user.email ?? student.user.phone ?? "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-500 flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-500" /> Points</p>
          <p className="font-bold text-2xl text-amber-600 mt-1">{totalPoints}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Parents */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 font-semibold text-gray-900">
            <Users className="h-4 w-4 text-blue-700" /> Parents / Guardians
          </div>
          <div className="divide-y divide-gray-100">
            {student.parents.map(p => (
              <div key={p.id} className="px-4 py-3">
                <p className="font-medium">{p.user.name} <span className="text-xs text-gray-400">({p.relationship})</span></p>
                <p className="text-sm text-gray-500">{p.user.phone ?? p.user.email ?? "—"}</p>
              </div>
            ))}
            {student.parents.length === 0 && <p className="p-4 text-sm text-gray-400">No parents linked</p>}
          </div>
        </div>

        {/* Enrollments */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 font-semibold text-gray-900">
            <BookOpen className="h-4 w-4 text-blue-700" /> Enrolled Classes
          </div>
          <div className="divide-y divide-gray-100">
            {student.enrollments.map(e => (
              <div key={e.id} className="px-4 py-3">
                <p className="font-medium">{e.class.subject.name}</p>
                <p className="text-sm text-gray-500">{e.class.name} · {e.class.teacher.user.name}</p>
              </div>
            ))}
            {student.enrollments.length === 0 && <p className="p-4 text-sm text-gray-400">Not enrolled in any class</p>}
          </div>
        </div>
      </div>

      {/* Recent results */}
      {student.examResults.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">Recent Exam Results</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-600 font-medium">Exam</th>
                  <th className="text-left px-4 py-2 text-gray-600 font-medium">Date</th>
                  <th className="text-right px-4 py-2 text-gray-600 font-medium">Score</th>
                  <th className="text-right px-4 py-2 text-gray-600 font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {student.examResults.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium">{r.title}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(r.examDate).toLocaleDateString("en-MY")}</td>
                    <td className="px-4 py-2 text-right font-semibold">{r.score}/{r.maxScore}</td>
                    <td className="px-4 py-2 text-right font-bold text-blue-700">{Math.round(r.score / r.maxScore * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
