import { create } from 'zustand';
import type { ConnectionInfo, ConnectionType, NodeConfig, ConnectionSchema } from '../types/pipeline';

function backendUrl(): string | null {
  const url = (import.meta as any).env?.VITE_BACKEND_URL as string | undefined;
  if (url && url.trim().length > 0) return url.trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:9000';
  }
  return null;
}

const NEW_ID_PREFIX = 'conn';
const generateId = () => `${NEW_ID_PREFIX}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;

interface ConnectionsStore {
  items: ConnectionInfo[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  schema: ConnectionSchema | null;
  loadConnections: () => Promise<void>;
  loadSchema: () => Promise<void>;
  select: (id: string | null) => void;
  saveConnection: (partial: Partial<ConnectionInfo> & { type: ConnectionType }) => Promise<string | null>;
}

export const useConnectionsStore = create<ConnectionsStore>()((set, get) => ({
  items: [],
  selectedId: null,
  loading: false,
  error: null,
  schema: null,

  select: (id) => set({ selectedId: id }),

  loadConnections: async () => {
    const beUrl = backendUrl();
    if (!beUrl) {
      set({ items: [], error: 'Backend not configured (VITE_BACKEND_URL).' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const r = await fetch(`${beUrl}/api/connections`);
      if (!r.ok) throw new Error(await r.text());
      const payload = await r.json();
      set({ items: payload.connections ?? [] });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), items: [] });
    } finally {
      set({ loading: false });
    }
  },

  loadSchema: async () => {
    const beUrl = backendUrl();
    if (!beUrl) {
      set({ schema: null, error: 'Backend not configured (VITE_BACKEND_URL).' });
      return;
    }
    try {
      const r = await fetch(`${beUrl}/api/connections/schema`);
      if (!r.ok) throw new Error(await r.text());
      const payload = await r.json();
      set({ schema: payload.schema ?? null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  saveConnection: async (partial) => {
    const beUrl = backendUrl();
    if (!beUrl) return null;
    const id = partial.id ?? generateId();
    const doc: ConnectionInfo = {
      id,
      name: partial.name?.trim() || 'New Connection',
      type: partial.type,
      config: (partial.config ?? {}) as NodeConfig,
      updatedAtMs: Date.now(),
    };
    const r = await fetch(`${beUrl}/api/connections/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!r.ok) {
      set({ error: await r.text() });
      return null;
    }
    const existing = get().items.filter((c) => c.id !== id);
    set({ items: [...existing, doc], selectedId: id, error: null });
    return id;
  },
}));
