import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Send, Inbox } from "lucide-react";
import { markMessageRead } from "./actions";

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function recipientLabel(type: string, id: string | null, meta: Record<string, string>): string {
  if (type === "USER") return meta[id ?? ""] ?? "Unknown user";
  if (type === "CLASS") return `Class: ${meta[id ?? ""] ?? id}`;
  if (type === "BRANCH") return `Branch: ${meta[id ?? ""] ?? id}`;
  if (type === "ALL") return "Everyone";
  return type;
}

export default async function MessagesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  // Inbox: messages addressed directly to this user
  const inbox = await db.message.findMany({
    where: { recipientType: "USER", recipientId: userId },
    include: { sender: { select: { name: true } } },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  // Sent: messages this user sent
  const sent = await db.message.findMany({
    where: { senderId: userId },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  // Resolve recipient names for sent messages
  const userIds = sent
    .filter(m => m.recipientType === "USER" && m.recipientId)
    .map(m => m.recipientId!);
  const users = userIds.length > 0
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

  const canCompose = ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role);
  const unreadInbox = inbox.filter(m => !m.isRead).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-700" /> Messages
          </h1>
          {unreadInbox > 0 && (
            <p className="text-sm text-gray-500 mt-1">{unreadInbox} unread</p>
          )}
        </div>
        {canCompose && (
          <Link href="/messages/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Compose</Button>
          </Link>
        )}
      </div>

      {/* Inbox */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Inbox className="h-4 w-4" /> Inbox ({inbox.length})
        </h2>
        {inbox.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            No messages received yet.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
            {inbox.map(msg => {
              const markRead = markMessageRead.bind(null, msg.id);
              return (
                <div key={msg.id} className={`flex items-start gap-4 px-5 py-4 ${msg.isRead ? "" : "bg-blue-50/50"}`}>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                    {msg.sender.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{msg.sender.name}</p>
                      <span className="text-xs text-gray-400">{timeAgo(msg.sentAt)}</span>
                    </div>
                    <p className={`text-sm mt-0.5 ${msg.isRead ? "text-gray-500" : "text-gray-800"}`}>
                      {msg.content}
                    </p>
                    {!msg.isRead && (
                      <form action={markRead} className="mt-1.5">
                        <button type="submit" className="text-xs text-blue-600 hover:underline">
                          Mark as read
                        </button>
                      </form>
                    )}
                  </div>
                  {!msg.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sent */}
      {sent.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Send className="h-4 w-4" /> Sent ({sent.length})
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
            {sent.map(msg => (
              <div key={msg.id} className="flex items-start gap-4 px-5 py-4">
                <Send className="h-4 w-4 text-gray-300 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-500">
                      To: <span className="font-medium text-gray-700">
                        {recipientLabel(msg.recipientType, msg.recipientId, userMap)}
                      </span>
                    </p>
                    <span className="text-xs text-gray-400">{timeAgo(msg.sentAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
