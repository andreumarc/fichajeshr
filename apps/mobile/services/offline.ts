import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import { api } from './api';

export interface OfflineEntry {
  id: string;
  type: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  workCenterId?: string;
  notes?: string;
}

const OFFLINE_QUEUE_KEY = 'offline_queue';

export async function queueOfflineEntry(entry: Omit<OfflineEntry, 'id'>) {
  const existing = await getOfflineQueue();
  const newEntry: OfflineEntry = {
    ...entry,
    id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY, JSON.stringify([...existing, newEntry]));
  return newEntry;
}

export async function getOfflineQueue(): Promise<OfflineEntry[]> {
  const raw = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function syncOfflineQueue(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected) {
    return { synced: 0, failed: 0, errors: ['Sin conexión'] };
  }

  const queue = await getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, errors: [] };

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const remaining: OfflineEntry[] = [];

  const endpointMap: Record<string, string> = {
    CHECK_IN: 'clock-in',
    CHECK_OUT: 'clock-out',
    BREAK_START: 'break-start',
    BREAK_END: 'break-end',
  };

  for (const entry of queue) {
    const endpoint = endpointMap[entry.type];
    if (!endpoint) { remaining.push(entry); continue; }

    try {
      await api.post(`/time-entries/${endpoint}`, {
        timestamp: entry.timestamp,
        latitude: entry.latitude,
        longitude: entry.longitude,
        accuracy: entry.accuracy,
        workCenterId: entry.workCenterId,
        notes: entry.notes,
        isOffline: true,
        syncedAt: new Date().toISOString(),
        deviceType: 'MOBILE_IOS',
      });
      synced++;
    } catch (err: any) {
      failed++;
      errors.push(`${entry.type} at ${entry.timestamp}: ${err.message}`);
      remaining.push(entry);
    }
  }

  await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed, errors };
}

export async function getOfflineQueueCount(): Promise<number> {
  const queue = await getOfflineQueue();
  return queue.length;
}
