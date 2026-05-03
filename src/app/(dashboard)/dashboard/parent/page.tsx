import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { StatCard } from "@/components/layout/stat-card";
import { GraduationCap, CreditCard, ClipboardList, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusColor = {
  ACTIVE: "success",
  TRIAL: "warning",
  INACTIVE: "secondary",
  GRADUATED: "default",
} as const;

export default async function ParentDashboard() {
  const session = await auth();
  if (!session || session.user.role !== "PARENT") redirect("/login");

  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: {
          user: { select: { name: true } },
          branch: { select: { name: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              class: {
                include: { subject: { select: { name: true } } },
              },
            },
          },
          invoices: {
            where: { status: { in: ["PENDING", "OVERDUE"] } },
            orderBy: { dueDate: "asc" },
          },
          points: { orderBy: { earnedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!parent) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>Parent profile not found. Contact admin.</p>
      </div>
    );
  }

  const totalDue = parent.children
    .flatMap((c) => c.invoices)
    .reduce((a, inv) => a + inv.amount + inv.lateFee, 0);

  const totalPoints = parent.children
    .flatMap((c) => c.points)
    .reduce((a, p) => a + p.points, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Managing {parent.children.length} child{parent.children.length !== 1 ? "ren" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Children" value={parent.children.length} icon={GraduationCap} color="blue" />
        <StatCard
          title="Fees Due"
          value={formatCurrency(totalDue)}
          icon={CreditCard}
          color={totalDue > 0 ? "red" : "green"}
        />
        <StatCard
          title="Active Classes"
          value={parent.children.reduce((a, c) => a + c.enrollments.length, 0)}
          icon={ClipboardList}
          color="green"
        />
        <StatCard title="Total Points" value={totalPoints} icon={Trophy} color="amber" />
      </div>

      {/* Children cards */}
      <div className="space-y-4">
        {parent.children.map((child) => {
          const pendingFees = child.invoices.reduce((a, i) => a + i.amount + i.lateFee, 0);

          return (
            <div key={child.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{child.user.name}</h2>
                  <p className="text-sm text-gray-500">
                    {child.branch.name}
                    {child.formLevel ? ` · ${child.formLevel}` : ""}
                    {child.school ? ` · ${child.school}` : ""}
                  </p>
                </div>
                <Badge variant={statusColor[child.status]}>
                  {child.status.charAt(0) + child.status.slice(1).toLowerCase()}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-500 font-medium">Enrolled Classes</p>
                  <p className="text-xl font-bold text-blue-700">{child.enrollments.length}</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${pendingFees > 0 ? "bg-red-50" : "bg-green-50"}`}>
                  <p className={`text-xs font-medium ${pendingFees > 0 ? "text-red-500" : "text-green-500"}`}>
                    Pending Fees
                  </p>
                  <p className={`text-xl font-bold ${pendingFees > 0 ? "text-red-700" : "text-green-700"}`}>
                    {formatCurrency(pendingFees)}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-amber-500 font-medium">Points</p>
                  <p className="text-xl font-bold text-amber-700">
                    {child.points.reduce((a, p) => a + p.points, 0)}
                  </p>
                </div>
              </div>

              {/* Classes */}
              {child.enrollments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Enrolled Classes</p>
                  <div className="flex flex-wrap gap-2">
                    {child.enrollments.map((e) => (
                      <span
                        key={e.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-700"
                      >
                        {e.class.subject.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Link href={`/attendance?studentId=${child.id}`}>
                  <Button variant="outline" size="sm">Attendance</Button>
                </Link>
                <Link href={`/results?studentId=${child.id}`}>
                  <Button variant="outline" size="sm">Results</Button>
                </Link>
                {pendingFees > 0 && (
                  <Link href="/fees">
                    <Button size="sm" variant="gold">Pay Fees</Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {parent.children.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No children registered yet. Contact your centre admin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
