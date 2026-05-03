import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { markOverdue } from "./actions";

const statusVariant = {
  PENDING: "warning",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "secondary",
} as const;

const statusIcon = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  PAID: <CheckCircle className="h-3.5 w-3.5" />,
  OVERDUE: <AlertCircle className="h-3.5 w-3.5" />,
  CANCELLED: null,
};

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string; studentId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;

  let studentFilter: string | undefined;
  let branchFilter: string | undefined;

  if (session.user.role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId: session.user.id },
      include: { children: { select: { id: true } } },
    });
    if (!parent) redirect("/dashboard/parent");
    studentFilter = sp.studentId ?? undefined;
    // Parents only see their children's invoices
    const childIds = parent.children.map(c => c.id);
    const invoices = await db.invoice.findMany({
      where: {
        studentId: { in: childIds },
        ...(sp.status ? { status: sp.status as any } : {}),
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        payments: true,
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });
    return <InvoiceList invoices={invoices} session={session} role="PARENT" />;
  }

  if (session.user.role === "CENTRE_ADMIN") {
    const ba = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
    branchFilter = ba?.branchId;
  }

  const invoices = await db.invoice.findMany({
    where: {
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(sp.status ? { status: sp.status as any } : {}),
      ...(sp.studentId ? { studentId: sp.studentId } : {}),
    },
    include: {
      student: { include: { user: { select: { name: true } } } },
      branch: { select: { name: true } },
      payments: true,
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 200,
  });

  const stats = {
    pending: invoices.filter(i => i.status === "PENDING").reduce((a, i) => a + i.amount, 0),
    overdue: invoices.filter(i => i.status === "OVERDUE").reduce((a, i) => a + i.amount + i.lateFee, 0),
    paid: invoices.filter(i => i.status === "PAID").reduce((a, i) => a + i.payments.reduce((s, p) => s + p.amount, 0), 0),
  };

  const canManage = ["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-700" /> Fees & Payments
          </h1>
          <p className="text-sm text-gray-500 mt-1">{invoices.length} invoices</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <form action={markOverdue}>
              <Button type="submit" variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Update Overdue
              </Button>
            </form>
            <Link href="/fees/generate">
              <Button className="gap-2"><CreditCard className="h-4 w-4" /> Generate Invoices</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-amber-600 font-medium">Pending</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(stats.pending)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-red-600 font-medium">Overdue (incl. late fee)</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(stats.overdue)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-green-600 font-medium">Collected This Month</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(stats.paid)}</p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap">
        <select name="status" defaultValue={sp.status ?? ""}
          className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="OVERDUE">Overdue</option>
          <option value="PAID">Paid</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
      </form>

      {/* Invoice table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Student</th>
                  {!branchFilter && <th className="text-left px-4 py-3 font-semibold text-gray-600">Branch</th>}
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Month</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Due Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.student.user.name}</td>
                    {!branchFilter && <td className="px-4 py-3 text-gray-500">{(inv as any).branch?.name ?? "—"}</td>}
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(inv.month).toLocaleDateString("en-MY", { month: "long", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(inv.amount)}
                      {inv.lateFee > 0 && (
                        <span className="block text-xs text-red-500">+{formatCurrency(inv.lateFee)} late</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        {statusIcon[inv.status]}
                        <Badge variant={statusVariant[inv.status]}>{inv.status}</Badge>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/fees/${inv.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal inline component for parent view
function InvoiceList({ invoices, session, role }: { invoices: any[]; session: any; role: string }) {
  const stats = {
    pending: invoices.filter((i: any) => i.status === "PENDING").reduce((a: number, i: any) => a + i.amount, 0),
    overdue: invoices.filter((i: any) => i.status === "OVERDUE").reduce((a: number, i: any) => a + i.amount + i.lateFee, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-700" /> Fees & Payments
        </h1>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-amber-600 font-medium">Pending</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(stats.pending)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-xs text-red-600 font-medium">Overdue</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(stats.overdue)}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Child</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Month</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{inv.student.user.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(inv.month).toLocaleDateString("en-MY", { month: "long", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(inv.amount)}
                    {inv.lateFee > 0 && <span className="block text-xs text-red-500">+{formatCurrency(inv.lateFee)} late</span>}
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusVariant[inv.status as keyof typeof statusVariant]}>{inv.status}</Badge></td>
                  <td className="px-4 py-3">
                    <Link href={`/fees/${inv.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
