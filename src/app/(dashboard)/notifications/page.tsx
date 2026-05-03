import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, AlertCircle, CreditCard, BookOpen, Users, Info } from "lucide-react";
import { markAllRead, markOneRead } from "./actions";

const typeIcon: Record<string, React.ReactNode> = {
  ABSENT_ALERT: <Users className="h-4 w-4 text-red-500" />,
  INVOICE_GENERATED: <CreditCard className="h-4 w-4 text-blue-500" />,
  PAYMENT_RECEIVED: <CreditCard className="h-4 w-4 text-green-500" />,
  PAYMENT_OVERDUE: <AlertCircle className="h-4 w-4 text-red-500" />,
  HOMEWORK_DUE: <BookOpen className="h-4 w-4 text-amber-500" />,
  GENERAL: <Info className="h-4 w-4 text-gray-400" />,
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { sentAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-700" /> Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <Button type="submit" variant="outline" size="sm" className="gap-2">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {notifications.map(n => {
            const markRead = markOneRead.bind(null, n.id);
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                  n.isRead ? "bg-white" : "bg-blue-50/60"
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {typeIcon[n.type] ?? typeIcon.GENERAL}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.isRead ? "text-gray-700" : "text-gray-900 font-semibold"}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.sentAt)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{n.content}</p>
                  {!n.isRead && (
                    <form action={markRead} className="mt-2">
                      <button type="submit" className="text-xs text-blue-600 hover:underline">
                        Mark as read
                      </button>
                    </form>
                  )}
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
