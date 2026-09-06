export type CaseStreamEvent = {
  type: "created" | "updated" | "assigned";
  caseId: string;
  caseType: string;
  priority: string;
  status: string;
  locationText?: string | null;
  timestamp: string;
};

const clients = new Map<string, Set<(data: CaseStreamEvent) => void>>();
export const heartbeatIntervalMs = 30000;

export function getSubscribers(userId: string): Set<(data: CaseStreamEvent) => void> {
  if (!clients.has(userId)) clients.set(userId, new Set());
  return clients.get(userId)!;
}

export function broadcastCaseEvent(event: CaseStreamEvent) {
  const payload = { ...event, timestamp: new Date().toISOString() };
  for (const [, subscribers] of clients.entries()) {
    for (const fn of subscribers) {
      try { fn(payload); } catch { /* subscriber dead */ }
    }
  }
}
