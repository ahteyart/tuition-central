import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BarChart2, AlertTriangle, TrendingUp, Users, CreditCard, BookOpen } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { AISummary } from "./ai-summary";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard/student");
  }

  const sp = await searchParams;

  let branchId: string | undefined;
  if (session.user.role === "CENTRE_ADMIN") {
    const ba = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
    branchId = ba?.branchId;
  } else {
    branchId = sp.branchId;
  }

  const branches = session.user.role === "SUPER_ADMIN"
    ? await db.branch.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];

  const selectedBranch = branchId
    ? await db.branch.findUnique({ where: { id: branchId }, select: { id: true, name: true } })
    : null;

  const branchFilter = branchId ? { branchId } : {};
  const classBranchFilter = branchId ? { class: { branchId } } : {};

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalStudents,
    activeStudents,
    totalTeachers,
    activeClasses,
    payments,
    overdueInvoices,
    totalAttendance,
    presentAttendance,
    totalSubmissions,
    gradedSubmissions,
    recentAbsences,
  ] = await Promise.all([
    db.student.count({ where: branchFilter }),
    db.student.count({ where: { ...branchFilter, status: "ACTIVE" } }),
    db.teacher.count({ where: { ...branchFilter, isActive: true } }),
    db.class.count({ where: { ...branchFilter, isActive: true } }),
    db.payment.aggregate({
      where: { invoice: { ...branchFilter }, paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.invoice.aggregate({
      where: { ...branchFilter, status: "OVERDUE" },
      _sum: { amount: true },
      _count: true,
    }),
    db.attendance.count({
      where: { date: { gte: thirtyDaysAgo }, ...(branchId ? { class: { branchId } } : {}) },
    }),
    db.attendance.count({
      where: { status: "PRESENT", date: { gte: thirtyDaysAgo }, ...(branchId ? { class: { branchId } } : {}) },
    }),
    db.homeworkSubmission.count({
      where: { homework: branchId ? { class: { branchId } } : {} },
    }),
    db.homeworkSubmission.count({
      where: { reviewedAt: { not: null }, homework: branchId ? { class: { branchId } } : {} },
    }),
    db.attendance.findMany({
      where: { status: "ABSENT", date: { gte: thirtyDaysAgo }, ...(branchId ? { class: { branchId } } : {}) },
      select: {
        studentId: true,
        student: { select: { id: true, user: { select: { name: true } } } },
      },
    }),
  ]);

  const feesCollected = payments._sum.amount ?? 0;
  const feesOutstanding = overdueInvoices._sum.amount ?? 0;
  const attendanceRate = totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0;
  const hwCompletionRate = totalSubmissions > 0 ? (gradedSubmissions / totalSubmissions) * 100 : 0;

  // Aggregate at-risk students (3+ absences in 30 days)
  const absenceMap = new Map<string, { name: string; count: number; id: string }>();
  for (const a of recentAbsences) {
    const ex = absenceMap.get(a.studentId);
    if (ex) { ex.count++; }
    else { absenceMap.set(a.studentId, { name: a.student.user.name, id: a.student.id, count: 1 }); }
  }
  const atRiskStudents = Array.from(absenceMap.values())
    .filter(s => s.count >= 3)
    .sort((a, b) => b.count - a.count);

  const aiStats = {
    branchName: selectedBranch?.name ?? "All Branches",
    totalStudents: activeStudents,
    attendanceRate,
    feesCollected,
    feesOutstanding,
    hwCompletionRate,
    atRiskCount: atRiskStudents.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-blue-700" /> Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedBranch ? selectedBranch.name : "All Branches"} · Last 30 days
          </p>
        </div>
        {session.user.role === "SUPER_ADMIN" && branches.length > 0 && (
          <form className="flex gap-2">
            <select name="branchId" defaultValue={branchId ?? ""}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button type="submit"
              className="h-9 px-3 text-sm rounded-md border border-gray-300 hover:bg-gray-50">
              Filter
            </button>
          </form>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Students", value: activeStudents, sub: `${totalStudents} total`, icon: Users, color: "blue" },
          { label: "Attendance Rate", value: `${attendanceRate.toFixed(1)}%`, sub: `Last 30 days`, icon: TrendingUp, color: attendanceRate >= 80 ? "green" : "amber" },
          { label: "Fees Collected", value: formatCurrency(feesCollected), sub: "This month", icon: CreditCard, color: "green" },
          { label: "Fees Outstanding", value: formatCurrency(feesOutstanding), sub: `${overdueInvoices._count} invoices`, icon: AlertTriangle, color: "red" },
        ].map(card => (
          <div key={card.label} className={`bg-white border border-gray-200 rounded-xl shadow-sm p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 text-${card.color}-600`} />
              <p className={`text-xs font-medium text-${card.color}-600`}>{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Homework Reviewed
          </p>
          <p className="text-2xl font-bold text-gray-900">{hwCompletionRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-400">{gradedSubmissions} / {totalSubmissions} submissions</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Active Teachers
          </p>
          <p className="text-2xl font-bold text-gray-900">{totalTeachers}</p>
          <p className="text-xs text-gray-400">{activeClasses} active classes</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <p className="text-xs font-medium text-red-500 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> At-Risk Students
          </p>
          <p className="text-2xl font-bold text-red-700">{atRiskStudents.length}</p>
          <p className="text-xs text-gray-400">3+ absences in 30 days</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* At-risk students */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="font-semibold text-gray-900">At-Risk Students</h2>
          </div>
          {atRiskStudents.length === 0 ? (
            <p className="p-5 text-sm text-center text-green-600">No at-risk students — great attendance!</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {atRiskStudents.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <Link href={`/students/${s.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                    {s.name}
                  </Link>
                  <span className="text-sm font-semibold text-red-600">{s.count} absences</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Summary */}
        <div className="space-y-4">
          <AISummary stats={aiStats} />

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link href="/fees/generate" className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors">
                <CreditCard className="h-4 w-4 text-blue-600" /> Generate Invoices
              </Link>
              <Link href="/fees?status=OVERDUE" className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors">
                <AlertTriangle className="h-4 w-4 text-red-500" /> View Overdue Fees
              </Link>
              <Link href="/attendance" className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors">
                <Users className="h-4 w-4 text-green-600" /> Attendance Records
              </Link>
              <Link href="/homework" className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-amber-50 hover:border-amber-200 transition-colors">
                <BookOpen className="h-4 w-4 text-amber-600" /> Homework Overview
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
