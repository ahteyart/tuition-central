import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/dashboard/super-admin",
  CENTRE_ADMIN: "/dashboard/admin",
  TEACHER: "/dashboard/teacher",
  PARENT: "/dashboard/parent",
  STUDENT: "/dashboard/student",
};

export default async function RootPage() {
  const session = await auth();
  if (!session) redirect("/login");
  redirect(ROLE_HOME[session.user.role] ?? "/login");
}
