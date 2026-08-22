export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendExpoPushNotifications(messages: PushMessage[]): Promise<{ success: boolean; error?: string }> {
  if (!messages.length) return { success: true };

  const expoPushUrl = "https://exp.host/--/api/v2/push/send";
  const tickets = messages.map((message) => ({
    to: message.to,
    sound: "default",
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  }));

  try {
    const res = await fetch(expoPushUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(tickets),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Expo push error ${res.status}: ${text}` };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
