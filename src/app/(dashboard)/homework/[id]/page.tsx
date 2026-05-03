import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, BookOpen, Clock, CheckCircle, Users, Star, Trash2, Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { submitHomework, gradeSubmission, deleteHomework, generateAiFeedback } from "../actions";

export default async function HomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const hw = await db.homework.findUnique({
    where: { id },
    include: {
      class: {
        select: {
          name: true,
          subject: { select: { name: true } },
          branch: { select: { name: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            include: { student: { include: { user: { select: { name: true } } } } },
          },
        },
      },
      submissions: {
        include: { student: { include: { user: { select: { name: true } } } } },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!hw) notFound();

  const isTeacherOrAdmin = ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role);
  const isStudent = session.user.role === "STUDENT";
  const isOverdue = new Date(hw.dueDate) < new Date();

  let myStudentId: string | null = null;
  let mySubmission: (typeof hw.submissions)[0] | null = null;

  if (isStudent) {
    const student = await db.student.findUnique({ where: { userId: session.user.id } });
    if (!student) redirect("/homework");
    myStudentId = student.id;
    mySubmission = hw.submissions.find(s => s.studentId === student.id) ?? null;

    // Verify student is enrolled
    const isEnrolled = hw.class.enrollments.some(e => e.student.userId === session.user.id);
    if (!isEnrolled) redirect("/homework");
  }

  const submittedIds = new Set(hw.submissions.map(s => s.studentId));
  const notSubmitted = hw.class.enrollments.filter(e => !submittedIds.has(e.student.id));

  const deleteAction = deleteHomework.bind(null, id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/homework">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{hw.title}</h1>
          <p className="text-sm text-gray-500">{hw.class.subject.name} · {hw.class.name} · {hw.class.branch.name}</p>
        </div>
        {isTeacherOrAdmin && (
          <form action={deleteAction}>
            <Button type="submit" variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>

      {/* Assignment details */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Clock className="h-4 w-4 text-gray-400" /> Due: {formatDate(hw.dueDate)}
          </span>
          {isOverdue && <Badge variant="danger">Overdue</Badge>}
          {isTeacherOrAdmin && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <Users className="h-4 w-4 text-gray-400" />
              {hw.submissions.length} / {hw.class.enrollments.length} submitted
            </span>
          )}
        </div>
        {hw.description && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-3">{hw.description}</p>
        )}
      </div>

      {/* Student: submission form */}
      {isStudent && myStudentId && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            {mySubmission ? "Your Submission" : "Submit Assignment"}
          </h2>

          {mySubmission ? (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                Submitted on {formatDate(mySubmission.submittedAt)}
              </div>
              {mySubmission.teacherNote && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-700 mb-1">Your note:</p>
                  <p className="bg-gray-50 rounded-lg p-3">{mySubmission.teacherNote}</p>
                </div>
              )}
              {mySubmission.aiFeedback && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-700 mb-1">Teacher feedback:</p>
                  <p className="bg-blue-50 rounded-lg p-3 text-blue-700">{mySubmission.aiFeedback}</p>
                </div>
              )}
              {mySubmission.score != null && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-gray-900">{mySubmission.score} points</span>
                  <span className="text-xs text-gray-400">reviewed {mySubmission.reviewedAt ? formatDate(mySubmission.reviewedAt) : ""}</span>
                </div>
              )}
            </div>
          ) : (
            <form action={submitHomework.bind(null, id, myStudentId)} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Submission Note <span className="text-gray-400">(optional)</span></label>
                <textarea name="note" rows={3} placeholder="Any notes for your teacher…"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <Button type="submit" className="w-full gap-2">
                <CheckCircle className="h-4 w-4" /> Mark as Submitted
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Teacher/Admin: submissions list */}
      {isTeacherOrAdmin && (
        <div className="space-y-4">
          {/* Submitted */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h2 className="font-semibold text-gray-900">Submitted ({hw.submissions.length})</h2>
            </div>
            {hw.submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No submissions yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {hw.submissions.map(sub => {
                  const gradeAction = gradeSubmission.bind(null, sub.id, id);
                  return (
                    <div key={sub.id} className="px-5 py-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{sub.student.user.name}</p>
                          <p className="text-xs text-gray-400">{formatDate(sub.submittedAt)}</p>
                          {sub.teacherNote && (
                            <p className="text-xs text-gray-500 mt-1 italic">"{sub.teacherNote}"</p>
                          )}
                        </div>
                        {sub.score != null ? (
                          <Badge variant="success" className="flex items-center gap-1">
                            <Star className="h-3 w-3" /> {sub.score} pts
                          </Badge>
                        ) : (
                          <Badge variant="warning">Pending review</Badge>
                        )}
                      </div>
                      <form action={gradeAction} className="flex gap-2">
                        <input type="number" name="score" min="0" max="100" step="0.5"
                          defaultValue={sub.score ?? ""}
                          placeholder="Score"
                          className="w-20 h-8 rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                        <input type="text" name="feedback" defaultValue={sub.aiFeedback ?? ""}
                          placeholder="Feedback (optional)"
                          className="flex-1 h-8 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                        <Button type="submit" size="sm" variant="outline">Save</Button>
                      </form>
                      <form action={generateAiFeedback.bind(null, sub.id, id)}>
                        <Button type="submit" size="sm" variant="outline"
                          className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 h-7 text-xs">
                          <Sparkles className="h-3 w-3" /> AI Feedback
                        </Button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Not submitted */}
          {notSubmitted.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-red-600">Not Submitted ({notSubmitted.length})</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {notSubmitted.map(e => (
                  <div key={e.id} className="px-5 py-3 text-sm text-gray-700">
                    {e.student.user.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
