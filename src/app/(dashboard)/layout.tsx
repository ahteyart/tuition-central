import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { LangProvider } from "@/lib/lang-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const unreadCount = await db.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  return (
    <LangProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar role={session.user.role} userName={session.user.name ?? "User"} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopNav userName={session.user.name ?? "User"} unreadCount={unreadCount} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </LangProvider>
  );
}
