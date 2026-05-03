import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart2, Plus, Star } from "lucide-react";
import { formatDate } from "@/lib/utils";

function gradeBadge(pct: number) {
  if (pct >= 90) return { label: "A+", variant: "success" } as const;
  if (pct >= 80) return { label: "A", variant: "success" } as const;
  if (pct >= 70) return { label: "B", variant: "warning" } as const;
  if (pct >= 60) return { label: "C", variant: "warning" } as const;
  if (pct >= 50) return { label: "D", variant: "secondary" } as const;
  return { label: "F", variant: "danger" } as const;
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; classId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  let results: any[] = [];

  if (session.user.role === "STUDENT") {
    const student = await db.student.findUnique({ where: { userId: session.user.id } });
    if (!student) redirect("/dashboard/student");

    results = await db.examResult.findMany({
      where: { studentId: student.id },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { examDate: "desc" },
    });
  } else if (session.user.role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId: session.user.id },
      include: { children: { select: { id: true } } },
    });
    if (!parent) redirect("/dashboard/parent");

    results = await db.examResult.findMany({
      where: { studentId: { in: parent.children.map(c => c.id) } },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { examDate: "desc" },
    });
  } else {
    let branchFilter: string | undefined;
    if (session.user.role === "CENTRE_ADMIN") {
      const ba = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
      branchFilter = ba?.branchId;
    }

    results = await db.examResult.findMany({
      where: {
        ...(sp.studentId ? { studentId: sp.studentId } : {}),
        ...(sp.classId ? { classId: sp.classId } : {}),
      },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            branch: { select: { name: true } },
          },
        },
      },
      orderBy: { examDate: "desc" },
      take: 300,
    });

    if (branchFilter) {
      results = results.filter((r: any) => r.student.branchId === branchFilter);
    }
  }

  const canAdd = ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role);
  const showStudent = !["STUDENT"].includes(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-blue-700" /> Exam Results
          </h1>
          <p className="text-sm text-gray-500 mt-1">{results.length} result{results.length !== 1 ? "s" : ""}</p>
        </div>
        {canAdd && (
          <Link href="/results/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Result</Button>
          </Link>
        )}
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No results recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {showStudent && <th className="text-left px-5 py-3 font-semibold text-gray-600">Student</th>}
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Exam</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Score</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r: any) => {
                  const pct = (r.score / r.maxScore) * 100;
                  const grade = gradeBadge(pct);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      {showStudent && (
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {r.student.user.name}
                          {r.student.branch && (
                            <span className="block text-xs text-gray-400">{r.student.branch.name}</span>
                          )}
                        </td>
                      )}
                      <td className="px-5 py-3 text-gray-900">{r.title}</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(r.examDate)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="flex items-center justify-end gap-1 font-semibold">
                          <Star className="h-3.5 w-3.5 text-amber-400" />
                          {r.score} / {r.maxScore}
                        </span>
                        <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={grade.variant}>{grade.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
