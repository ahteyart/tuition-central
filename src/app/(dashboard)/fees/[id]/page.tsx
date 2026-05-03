import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, CheckCircle, AlertCircle, Clock, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { recordPayment } from "../actions";

const statusVariant = {
  PENDING: "warning",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "secondary",
} as const;

const statusIcon = {
  PENDING: <Clock className="h-4 w-4" />,
  PAID: <CheckCircle className="h-4 w-4" />,
  OVERDUE: <AlertCircle className="h-4 w-4" />,
  CANCELLED: null,
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      student: { include: { user: { select: { name: true, email: true } } } },
      branch: { select: { name: true } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });

  if (!invoice) notFound();

  // Parents can only view their children's invoices
  if (session.user.role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId: session.user.id },
      include: { children: { select: { id: true } } },
    });
    if (!parent || !parent.children.some(c => c.id === invoice.studentId)) {
      redirect("/fees");
    }
  }

  // Students can only view their own invoices
  if (session.user.role === "STUDENT") {
    const student = await db.student.findUnique({ where: { userId: session.user.id } });
    if (!student || student.id !== invoice.studentId) redirect("/fees");
  }

  const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const totalDue = invoice.amount + invoice.lateFee;
  const balance = totalDue - totalPaid;
  const canManage = ["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role);

  const recordPaymentForInvoice = recordPayment.bind(null, invoice.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/fees">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-700" /> Invoice
          </h1>
          <p className="text-sm text-gray-500 font-mono">{invoice.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* Invoice summary card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">{invoice.student.user.name}</p>
            <p className="text-sm text-gray-500">{invoice.student.user.email}</p>
            <p className="text-sm text-blue-600">{invoice.branch.name}</p>
          </div>
          <span className="flex items-center gap-1.5">
            {statusIcon[invoice.status]}
            <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
          </span>
        </div>

        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Billing Month</p>
            <p className="font-medium text-gray-900">
              {new Date(invoice.month).toLocaleDateString("en-MY", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Due Date</p>
            <p className="font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Tuition Fee</span>
            <span className="font-medium">{formatCurrency(invoice.amount)}</span>
          </div>
          {invoice.lateFee > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Late Fee (5%)</span>
              <span className="font-medium">+{formatCurrency(invoice.lateFee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-base">
            <span>Total Due</span>
            <span>{formatCurrency(totalDue)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Amount Paid</span>
            <span className="font-medium">−{formatCurrency(totalPaid)}</span>
          </div>
          <div className={`flex justify-between border-t border-gray-200 pt-2 text-lg font-bold ${balance > 0 ? "text-red-700" : "text-green-700"}`}>
            <span>Balance</span>
            <span>{formatCurrency(balance)}</span>
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-600" /> Payment History
          </h2>
        </div>
        {invoice.payments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No payments recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-gray-600 font-semibold">Date</th>
                <th className="text-left px-6 py-3 text-gray-600 font-semibold">Method</th>
                <th className="text-left px-6 py-3 text-gray-600 font-semibold">Reference</th>
                <th className="text-right px-6 py-3 text-gray-600 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoice.payments.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-3 text-gray-600">{formatDate(p.paidAt)}</td>
                  <td className="px-6 py-3">
                    <Badge variant="secondary">{p.method}</Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">{p.reference ?? "—"}</td>
                  <td className="px-6 py-3 text-right font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record payment form — admins only, only if not fully paid */}
      {canManage && invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Record Payment</h2>
          <form action={recordPaymentForInvoice} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Amount (RM)</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  defaultValue={balance > 0 ? balance.toFixed(2) : ""}
                  required
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  name="method"
                  required
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="FPX">FPX / Online Banking</option>
                  <option value="DUITNOW">DuitNow</option>
                  <option value="CREDIT_CARD">Credit / Debit Card</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Reference / Receipt No. <span className="text-gray-400">(optional)</span></label>
              <input
                type="text"
                name="reference"
                placeholder="e.g. TXN1234567"
                className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <Button type="submit" className="w-full gap-2">
              <CheckCircle className="h-4 w-4" /> Confirm Payment
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
