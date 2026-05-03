import { GoogleGenAI } from "@google/genai";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

type ChatMessage = { role: "user" | "model"; text: string };

export async function chatWithTutor(
  subject: string,
  level: string,
  history: ChatMessage[],
  question: string
): Promise<string> {
  const ai = getClient();
  if (!ai) {
    return "AI tutoring is not configured yet. Please set the GEMINI_API_KEY environment variable.";
  }

  const contents = [
    ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user" as const, parts: [{ text: question }] },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents,
    config: {
      systemInstruction: `You are an expert ${subject} tutor for Malaysian students at the ${level} level. Explain concepts clearly, step-by-step. Use simple English and relate examples to the Malaysian school context (e.g. SPM, PT3 exam formats). Be encouraging, patient and concise. When solving problems, always show your working.`,
    },
  });

  return response.text ?? "";
}

export async function generateAIHomeworkFeedback(
  title: string,
  description: string | null,
  studentNote: string | null
): Promise<string> {
  const ai = getClient();
  if (!ai) {
    return "AI feedback not configured. Set GEMINI_API_KEY to enable this feature.";
  }

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: `You are a helpful Malaysian school teacher reviewing a student's homework.

Assignment: ${title}
${description ? `Instructions: ${description}` : ""}
Student's note: ${studentNote || "(No note — student marked as submitted without a note)"}

Provide a brief review with:
1. A 2-3 sentence constructive assessment
2. One specific strength observed
3. One area to improve
4. Suggested score out of 100

Be concise and encouraging. Plain text only, no markdown.`,
  });

  return response.text ?? "";
}

export async function generateBranchSummary(stats: {
  branchName: string;
  totalStudents: number;
  attendanceRate: number;
  feesCollected: number;
  feesOutstanding: number;
  hwCompletionRate: number;
  atRiskCount: number;
}): Promise<string> {
  const ai = getClient();
  if (!ai) {
    return "AI summary not configured. Set GEMINI_API_KEY to enable this feature.";
  }

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: `Write a 3-4 sentence professional monthly performance summary for a Malaysian tuition centre manager.

Branch: ${stats.branchName}
Students: ${stats.totalStudents}
Attendance Rate: ${stats.attendanceRate.toFixed(1)}%
Fees Collected: RM ${stats.feesCollected.toFixed(2)}
Fees Outstanding: RM ${stats.feesOutstanding.toFixed(2)}
Homework Completion: ${stats.hwCompletionRate.toFixed(1)}%
At-Risk Students: ${stats.atRiskCount}

Highlight key performance indicators, note any areas of concern, and give one actionable recommendation. Plain English, no bullet points.`,
  });

  return response.text ?? "";
}
