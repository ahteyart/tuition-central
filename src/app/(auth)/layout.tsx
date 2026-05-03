import { LangProvider } from "@/lib/lang-context";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <LangProvider>{children}</LangProvider>;
}
