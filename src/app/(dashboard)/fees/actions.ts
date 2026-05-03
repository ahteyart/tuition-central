"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notifyParentsOfStudent, createNotification } from "@/lib/notifications";
import { formatCurrency, formatDate } from "@/lib/utils";

async function assertAdmin() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function generateMonthlyInvoices(branchId: string, month: string): Promise<{ created: number }> {
  await assertAdmin();

  const monthDate = new Date(month + "-01");
  const dueDate = new Date(monthDate);
  dueDate.setDate(15);

  const enrollments = await db.enrollment.findMany({
    where: { status: "ACTIVE", class: { branchId, isActive: true } },
    include: {
      class: { select: { feeAmount: true, branchId: true } },
      student: { select: { id: true } },
    },
  });

  const studentFees: Record<string, { studentId: string; branchId: string; total: number }> = {};
  for (const e of enrollments) {
    if (!studentFees[e.studentId]) {
      studentFees[e.studentId] = { studentId: e.studentId, branchId: e.class.branchId, total: 0 };
    }
    studentFees[e.studentId].total += e.class.feeAmount;
  }

  let created = 0;
  for (const sf of Object.values(studentFees)) {
    if (sf.total === 0) continue;

    const existing = await db.invoice.findFirst({
      where: { studentId: sf.studentId, branchId: sf.branchId, month: monthDate },
    });
    if (existing) continue;

    await db.invoice.create({
      data: {
        studentId: sf.studentId,
        branchId: sf.branchId,
        month: monthDate,
        amount: sf.total,
        dueDate,
        status: "PENDING",
      },
    });

    // Notify student + parents
    const student = await db.student.findUnique({
      where: { id: sf.studentId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (student) {
      const title = "New Invoice";
      const content = `Invoice of ${formatCurrency(sf.total)} for ${monthDate.toLocaleDateString("en-MY", { month: "long", year: "numeric" })} is ready. Due by ${formatDate(dueDate)}.`;
      await createNotification(student.user.id, "INVOICE_GENERATED", title, content);
      await notifyParentsOfStudent(sf.studentId, "INVOICE_GENERATED", title, content);
    }

    created++;
  }

  revalidatePath("/fees");
  return { created };
}

export async function recordPayment(invoiceId: string, formData: FormData): Promise<void> {
  await assertAdmin();

  const amount = parseFloat(formData.get("amount") as string);
  const method = formData.get("method") as string;
  const reference = formData.get("reference") as string;

  if (!amount || amount <= 0) throw new Error("Invalid amount");

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { student: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!invoice) throw new Error("Invoice not found");

  await db.payment.create({
    data: { invoiceId, amount, method: method as any, reference: reference || null },
  });

  const payments = await db.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  const totalPaid = payments._sum.amount ?? 0;

  if (totalPaid >= invoice.amount + invoice.lateFee) {
    await db.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });

    const content = `Payment of ${formatCurrency(amount)} received. Your invoice is now fully paid. Thank you!`;
    await createNotification(invoice.student.user.id, "PAYMENT_RECEIVED", "Payment Received", content);
    await notifyParentsOfStudent(invoice.studentId, "PAYMENT_RECEIVED", "Payment Received", content);
  }

  revalidatePath("/fees");
  revalidatePath(`/fees/${invoiceId}`);
  redirect(`/fees/${invoiceId}`);
}

export async function markOverdue(): Promise<void> {
  await assertAdmin();

  const today = new Date();
  await db.invoice.updateMany({
    where: { status: "PENDING", dueDate: { lt: today } },
    data: { status: "OVERDUE" },
  });

  const overdue = await db.invoice.findMany({
    where: { status: "OVERDUE", lateFee: 0 },
    include: { student: { include: { user: { select: { id: true, name: true } } } } },
  });

  for (const inv of overdue) {
    const lateFee = Math.round(inv.amount * 0.05 * 100) / 100;
    await db.invoice.update({ where: { id: inv.id }, data: { lateFee } });

    const content = `Invoice of ${formatCurrency(inv.amount)} is overdue. A late fee of ${formatCurrency(lateFee)} has been added. Please settle immediately.`;
    await createNotification(inv.student.user.id, "PAYMENT_OVERDUE", "Invoice Overdue", content);
    await notifyParentsOfStudent(inv.studentId, "PAYMENT_OVERDUE", "Invoice Overdue", content);
  }

  revalidatePath("/fees");
}
