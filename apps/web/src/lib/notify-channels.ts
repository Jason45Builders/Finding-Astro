export interface NotificationChannel {
  send(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }>;
}

const noopChannel: NotificationChannel = {
  send: async () => ({ success: false, error: "No notification channel configured" }),
};

export const emailChannel: NotificationChannel = {
  send: async (_to: string, _subject: string, _body: string) => {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.RESEND_FROM ?? "Finding Astro <noreply@findingastro.org>", to: _to, subject: _subject, text: _body }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Resend error ${res.status}: ${text}` };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  },
};

export const smsChannel: NotificationChannel = {
  send: async (_to: string, _body: string) => {
    if (!process.env.EXOTEL_API_KEY) {
      return { success: false, error: "EXOTEL_API_KEY not configured" };
    }
    try {
      const { exotelSid, exotelToken, exotelFrom } = process.env;
      const url = `https://api.exotel.com/v1/Accounts/${exotelSid}/Sms/send.json`;
      const body = new URLSearchParams({ From: exotelFrom ?? "", To: _to, Body: _body });
      const auth = Buffer.from(`${exotelSid}:${exotelToken}`).toString("base64");

      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Exotel error ${res.status}: ${text}` };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  },
};

export function getChannel(type: string): NotificationChannel {
  if (type === "email") return process.env.RESEND_API_KEY ? emailChannel : noopChannel;
  if (type === "sms") return process.env.EXOTEL_API_KEY ? smsChannel : noopChannel;
  return noopChannel;
}
