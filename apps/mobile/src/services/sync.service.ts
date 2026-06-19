import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { apiRequest } from "./api";

const SYNC_QUEUE_KEY = "@finding_astro/sync_queue";
const SYNC_STATUS_KEY = "@finding_astro/sync_status";

export type SyncStatus = "online" | "offline" | "syncing";

export interface QueuedRequest {
  id: string;
  path: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  skipAuth?: boolean;
  timestamp: number;
}

let currentStatus: SyncStatus = "online";
let statusListeners: ((status: SyncStatus) => void)[] = [];

export const getSyncStatus = (): SyncStatus => currentStatus;

export const subscribeToSyncStatus = (listener: (status: SyncStatus) => void): (() => void) => {
  statusListeners.push(listener);
  listener(currentStatus);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener);
  };
};

const setSyncStatus = (status: SyncStatus) => {
  currentStatus = status;
  statusListeners.forEach((l) => l(status));
};

export const initNetInfoListener = (): (() => void) => {
  const unsub = NetInfo.addEventListener((state) => {
    const isConnected = state.isConnected ?? true;
    if (!isConnected) {
      setSyncStatus("offline");
    } else if (currentStatus === "offline") {
      setSyncStatus("syncing");
      void processSyncQueue();
    } else {
      setSyncStatus("online");
    }
  });
  return unsub;
};

export const loadQueuedRequests = async (): Promise<QueuedRequest[]> => {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
};

export const saveQueuedRequest = async (req: QueuedRequest): Promise<void> => {
  const queue = await loadQueuedRequests();
  queue.push(req);
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  await AsyncStorage.setItem(SYNC_STATUS_KEY, "offline");
  setSyncStatus("offline");
};

export const clearSyncQueue = async (): Promise<void> => {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
};

export const processSyncQueue = async (): Promise<void> => {
  const queue = await loadQueuedRequests();
  if (queue.length === 0) {
    setSyncStatus("online");
    return;
  }

  setSyncStatus("syncing");
  const remaining: QueuedRequest[] = [];

  for (const req of queue) {
    try {
      await apiRequest(req.path, {
        method: req.method,
        body: req.body,
        token: req.token,
        skipAuth: req.skipAuth,
        retries: 1,
      });
    } catch {
      remaining.push(req);
    }
  }

  if (remaining.length > 0) {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
    setSyncStatus("offline");
  } else {
    await clearSyncQueue();
    setSyncStatus("online");
  }
};
