"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface AISummaryProps {
  stats: {
    branchName: string;
    totalStudents: number;
    attendanceRate: number;
    feesCollected: number;
    feesOutstanding: number;
    hwCompletionRate: number;
    atRiskCount: number;
  };
}

export function AISummary({ stats }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/report-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      });
      const data = await res.json();
      setSummary(data.summary ?? data.error ?? "Failed to generate summary.");
    } catch {
      setSummary("Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <p className="font-semibold text-blue-900 text-sm">AI-Generated Summary</p>
        </div>
        <Button onClick={generate} disabled={loading} size="sm" variant="outline"
          className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100">
          {loading
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
            : <><Sparkles className="h-3.5 w-3.5" /> {summary ? "Regenerate" : "Generate Summary"}</>}
        </Button>
      </div>
      {summary ? (
        <p className="text-sm text-blue-800 leading-relaxed">{summary}</p>
      ) : (
        <p className="text-sm text-blue-500 italic">
          Click "Generate Summary" to get an AI-powered narrative of this branch's performance.
        </p>
      )}
    </div>
  );
}
