"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { generateMonthlyInvoices } from "../actions";
import { BranchSelector } from "./branch-selector";

export default function GenerateInvoicesPage() {
  const [branchId, setBranchId] = useState("");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!branchId) { setError("Please select a branch."); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateMonthlyInvoices(branchId, month);
      setResult(res);
    } catch (err: any) {
      setError((err as Error).message ?? "Failed to generate invoices.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/fees">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-700" /> Generate Invoices
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Create monthly fee invoices for all active students</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Branch</label>
            <BranchSelector value={branchId} onChange={setBranchId} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Billing Month</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              required
              className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-xs text-gray-400">Invoices will be due on the 15th of this month.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                {result.created === 0
                  ? "All invoices already exist for this month — nothing new created."
                  : `Successfully created ${result.created} invoice${result.created !== 1 ? "s" : ""}.`}
              </span>
            </div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {loading ? "Generating…" : "Generate Invoices"}
          </Button>
        </form>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700 space-y-1.5">
        <p className="font-medium">How it works</p>
        <ul className="list-disc list-inside text-xs space-y-1 text-blue-600">
          <li>Finds all active enrollments for the selected branch and month</li>
          <li>Groups fees by student across all their enrolled classes</li>
          <li>Creates one invoice per student (skips if already generated)</li>
          <li>Due date is set to the 15th of the billing month</li>
        </ul>
      </div>
    </div>
  );
}
