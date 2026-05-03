import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { StatCard } from "@/components/layout/stat-card";
import { Building2, GraduationCap, Users, TrendingUp, AlertCircle, BookOpen, Bot, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function SuperAdminDashboard() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/login");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    branchCount,
    studentCount,
    teacherCount,
    classCount,
    overdueInvoices,
    recentStudents,
    branches,
    recentAbsences,
  ] = await Promise.all([
    db.branch.count({ where: { isActive: true } }),
    db.student.count({ where: { status: "ACTIVE" } }),
    db.teacher.count({ where: { isActive: true } }),
    db.class.count({ where: { isActive: true } }),
    db.invoice.findMany({
      where: { status: "OVERDUE" },
      include: { student: { include: { user: { select: { name: true } } } } },
      take: 5,
      orderBy: { dueDate: "asc" },
    }),
    db.student.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } },
        branch: { select: { name: true } },
      },
    }),
    db.branch.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { students: true, classes: true } },
      },
    }),
    db.attendance.findMany({
      where: { status: "ABSENT", date: { gte: thirtyDaysAgo } },
      select: { studentId: true, student: { select: { id: true, user: { select: { name: true } } } } },
    }),
  ]);

  const absenceMap = new Map<string, { name: string; id: string; count: number }>();
  for (const a of recentAbsences) {
    const ex = absenceMap.get(a.studentId);
    if (ex) { ex.count++; }
    else { absenceMap.set(a.studentId, { name: a.student.user.name, id: a.student.id, count: 1 }); }
  }
  const atRisk = Array.from(absenceMap.values()).filter(s => s.count >= 3).sort((a, b) => b.count - a.count);

  // Monthly revenue (paid invoices this month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const payments = await db.payment.aggregate({
    where: { paidAt: { gte: startOfMonth } },
    _sum: { amount: true },
  });
  const monthlyRevenue = payments._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of all branches and operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Branches"
          value={branchCount}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Active Students"
          value={studentCount}
          icon={GraduationCap}
          color="green"
        />
        <StatCard
          title="Active Teachers"
          value={teacherCount}
          icon={Users}
          color="amber"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          icon={TrendingUp}
          color="green"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Branch overview */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-700" />
              Branch Overview
            </h2>
            <Link href="/branches">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {branches.map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-400">{b.address}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-blue-700">{b._count.students} students</p>
                  <p className="text-xs text-gray-400">{b._count.classes} classes</p>
                </div>
              </div>
            ))}
            {branches.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                No branches yet.{" "}
                <Link href="/branches/new" className="text-blue-600 hover:underline">
                  Create one
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Overdue invoices */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Overdue Payments
            </h2>
            <Link href="/fees?status=OVERDUE">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {overdueInvoices.map((inv) => (
              <div key={inv.id} className="px-5 py-3">
                <p className="font-medium text-gray-900 text-sm">{inv.student.user.name}</p>
                <div className="flex justify-between mt-0.5">
                  <p className="text-xs text-gray-400">
                    Due {new Date(inv.dueDate).toLocaleDateString("en-MY")}
                  </p>
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(inv.amount)}
                  </p>
                </div>
              </div>
            ))}
            {overdueInvoices.length === 0 && (
              <p className="p-5 text-sm text-center text-green-600">All payments up to date!</p>
            )}
          </div>
        </div>
      </div>

      {/* At-risk students */}
      {atRisk.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> At-Risk Students ({atRisk.length})
            </h2>
            <Link href="/reports"><Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-100">Full Report</Button></Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {atRisk.slice(0, 6).map(s => (
              <Link key={s.id} href={`/students/${s.id}`}>
                <span className="inline-flex items-center gap-1.5 text-xs bg-white border border-red-200 text-red-700 px-2.5 py-1 rounded-full hover:bg-red-50">
                  {s.name} · {s.count} absences
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex gap-3 flex-wrap">
          <Link href="/branches/new">
            <Button variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" /> Add Branch
            </Button>
          </Link>
          <Link href="/students/new">
            <Button variant="outline" className="gap-2">
              <GraduationCap className="h-4 w-4" /> Add Student
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline" className="gap-2">
              <TrendingUp className="h-4 w-4" /> View Reports
            </Button>
          </Link>
          <Link href="/ai">
            <Button variant="outline" className="gap-2">
              <Bot className="h-4 w-4" /> AI Tutor
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
