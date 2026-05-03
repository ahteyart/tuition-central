import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { sendMessage } from "../actions";

export default async function ComposeMessagePage() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect("/messages");
  }

  // Fetch potential recipients: parents + students + teachers (depending on role)
  let recipientWhere: object = {};
  if (session.user.role === "CENTRE_ADMIN") {
    const ba = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
    if (ba) {
      const branchStudents = await db.student.findMany({
        where: { branchId: ba.branchId },
        select: { userId: true },
      });
      recipientWhere = { id: { in: branchStudents.map(s => s.userId) } };
    }
  }

  const recipients = await db.user.findMany({
    where: { isActive: true, role: { in: ["PARENT", "STUDENT", "TEACHER"] }, ...recipientWhere },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    take: 300,
  });

  const classes = session.user.role !== "TEACHER"
    ? await db.class.findMany({
        where: { isActive: true },
        select: { id: true, name: true, branch: { select: { name: true } } },
        orderBy: { name: "asc" },
      })
    : await db.class.findMany({
        where: {
          isActive: true,
          teacher: { userId: session.user.id },
        },
        select: { id: true, name: true, branch: { select: { name: true } } },
        orderBy: { name: "asc" },
      });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/messages">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-700" /> Compose Message
          </h1>
        </div>
      </div>

      <form action={sendMessage} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Send To</label>
          <select name="recipientType" required
            className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            defaultValue="USER">
            <option value="USER">Individual User</option>
            <option value="CLASS">Entire Class</option>
            {session.user.role === "SUPER_ADMIN" && <option value="ALL">Everyone</option>}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Recipient</label>
          <select name="recipientId"
            className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
            <option value="">— Select individual / class (or leave blank for All) —</option>
            <optgroup label="Users">
              {recipients.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.role.toLowerCase()}) {r.email ? `· ${r.email}` : ""}
                </option>
              ))}
            </optgroup>
            <optgroup label="Classes">
              {classes.map(c => (
                <option key={`class-${c.id}`} value={c.id}>
                  {c.name} ({c.branch.name})
                </option>
              ))}
            </optgroup>
          </select>
          <p className="text-xs text-gray-400">Leave blank only when sending to Everyone.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Message *</label>
          <textarea name="content" required rows={5}
            placeholder="Type your message here…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/messages" className="flex-1">
            <Button variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1 gap-2">Send Message</Button>
        </div>
      </form>
    </div>
  );
}
