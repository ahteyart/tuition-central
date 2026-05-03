import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { StatCard } from "@/components/layout/stat-card";
import { GraduationCap, Users, BookOpen, CreditCard, AlertCircle, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session || session.user.role !== "CENTRE_ADMIN") redirect("/login");

  const branchAdmin = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
  const branchId = branchAdmin?.branchId;

  if (!branchId) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>You are not assigned to any branch yet. Contact Super Admin.</p>
      </div>
    );
  }

  const branch = await db.branch.findUnique({ where: { id: branchId } });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [studentCount, teacherCount, classCount, overdueInvoices, todayAttendance, recentAbsences] =
    await Promise.all([
      db.student.count({ where: { branchId, status: "ACTIVE" } }),
      db.teacher.count({ where: { branchId, isActive: true } }),
      db.class.count({ where: { branchId, isActive: true } }),
      db.invoice.findMany({
        where: { branchId, status: "OVERDUE" },
        include: { student: { include: { user: { select: { name: true } } } } },
        take: 5,
      }),
      db.attendance.count({
        where: { date: new Date(), class: { branchId } },
      }),
      db.attendance.findMany({
        where: { status: "ABSENT", date: { gte: thirtyDaysAgo }, class: { branchId } },
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

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const payments = await db.payment.aggregate({
    where: { invoice: { branchId }, paidAt: { gte: startOfMonth } },
    _sum: { amount: true },
  });
  const monthlyRevenue = payments._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">{branch?.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Students" value={studentCount} icon={GraduationCap} color="blue" />
        <StatCard title="Teachers" value={teacherCount} icon={Users} color="amber" />
        <StatCard title="Active Classes" value={classCount} icon={BookOpen} color="green" />
        <StatCard title="Monthly Revenue" value={formatCurrency(monthlyRevenue)} icon={CreditCard} color="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
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
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-medium text-gray-900">{inv.student.user.name}</p>
                <p className="text-sm font-semibold text-red-600">{formatCurrency(inv.amount)}</p>
              </div>
            ))}
            {overdueInvoices.length === 0 && (
              <p className="p-5 text-sm text-center text-green-600">All payments up to date!</p>
            )}
          </div>
        </div>

        {atRisk.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-semibold text-red-800 flex items-center gap-2 mb-2 text-sm">
              <AlertTriangle className="h-4 w-4" /> {atRisk.length} At-Risk Student{atRisk.length !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-col gap-1">
              {atRisk.slice(0, 4).map(s => (
                <Link key={s.id} href={`/students/${s.id}`} className="text-xs text-red-700 hover:underline">
                  {s.name} — {s.count} absences
                </Link>
              ))}
              {atRisk.length > 4 && <Link href="/reports" className="text-xs text-red-500 hover:underline">+{atRisk.length - 4} more →</Link>}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/students/new">
              <Button variant="outline" className="w-full gap-2">
                <GraduationCap className="h-4 w-4" /> Add Student
              </Button>
            </Link>
            <Link href="/attendance">
              <Button variant="outline" className="w-full gap-2">
                <Users className="h-4 w-4" /> Attendance
              </Button>
            </Link>
            <Link href="/fees">
              <Button variant="outline" className="w-full gap-2">
                <CreditCard className="h-4 w-4" /> Fees
              </Button>
            </Link>
            <Link href="/classes">
              <Button variant="outline" className="w-full gap-2">
                <BookOpen className="h-4 w-4" /> Classes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
