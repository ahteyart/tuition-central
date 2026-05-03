import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { AiChatClient } from "./chat-client";

export default async function AiTutorPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bot className="h-6 w-6 text-blue-700" /> AI Tutor
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Powered by Google Gemini · Select your subject and level, then ask anything
        </p>
      </div>
      <AiChatClient />
    </div>
  );
}
