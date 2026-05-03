export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!apiKey || !phoneId) {
    console.log(`[WhatsApp STUB] To: ${phone}\n${message}`);
    return;
  }

  const to = phone.replace(/[^0-9]/g, "");
  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  if (!res.ok) {
    console.error("[WhatsApp] Send failed:", await res.text());
  }
}

export function fmtAbsentAlert(studentName: string, className: string, date: string): string {
  return `[Tuition Central] ${studentName} was marked ABSENT from ${className} on ${date}. Please contact the centre if this is unexpected.`;
}

export function fmtInvoiceReady(studentName: string, amount: string, dueDate: string): string {
  return `[Tuition Central] Invoice for ${studentName} is ready. Amount: RM ${amount}, due by ${dueDate}. Login to pay online.`;
}

export function fmtOverdueAlert(studentName: string, amount: string): string {
  return `[Tuition Central] REMINDER: ${studentName}'s invoice of RM ${amount} is overdue. A 5% late fee has been added. Please settle immediately.`;
}
