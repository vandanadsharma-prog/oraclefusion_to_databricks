import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { NODE_META } from '../../types/pipeline';
import type { NodeType } from '../../types/pipeline';
import { usePipelineStore } from '../../store/pipelineStore';

type PipelineListItem = { id: string; name?: string; updatedAtMs?: number };

type SavedPipelineDoc = {
  id: string;
  name?: string;
  nodes: any[];
  edges: any[];
  updatedAtMs?: number;
};

function backendUrl(): string | null {
  const url = (import.meta as any).env?.VITE_BACKEND_URL as string | undefined;
  if (url && url.trim().length > 0) return url.trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:9000';
  }
  return null;
}

function isSecretKey(key: string) {
  const k = key.toLowerCase();
  return (
    k.includes('password') ||
    k.includes('token') ||
    k.includes('secret') ||
    k.includes('accesskey') ||
    k === 'clientsecret'
  );
}

function displayValue(key: string, value: unknown) {
  if (isSecretKey(key)) {
    if (value === undefined || value === null || value === '') return '';
    return 'YourStrongPassword';
  }
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function parseValue(original: unknown, raw: string): unknown {
  if (typeof original === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : original;
  }
  if (typeof original === 'boolean') {
    const v = raw.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    return original;
  }
  return raw;
}

export function MetadataTab() {
  const activePipelineId = usePipelineStore((s) => s.activePipelineId);

  const [pipelines, setPipelines] = useState<PipelineListItem[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [doc, setDoc] = useState<SavedPipelineDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const [editing, setEditing] = useState<{
    nodeId: string;
    key: string;
    draft: string;
  } | null>(null);

  const beUrl = backendUrl();

  const loadPipelineList = async () => {
    if (!beUrl) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${beUrl}/api/pipelines`);
      if (!r.ok) throw new Error(await r.text());
      const payload = await r.json();
      const items: PipelineListItem[] = payload.pipelines ?? [];
      setPipelines(items);
      if (!selectedPipelineId) {
        const defaultId = activePipelineId ?? (items[0]?.id ?? '');
        if (defaultId) setSelectedPipelineId(defaultId);
      }
      if (selectedPipelineId && !items.some((p) => p.id === selectedPipelineId)) {
        setSelectedPipelineId('');
        setDoc(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPipelineDoc = async (id: string) => {
    if (!beUrl || !id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${beUrl}/api/pipelines/${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error(await r.text());
      const payload = await r.json();
      setDoc(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDoc(null);
    } finally {
      setLoading(false);
    }
  };

  const savePipelineDoc = async (next: SavedPipelineDoc) => {
    if (!beUrl) return;
    const r = await fetch(`${beUrl}/api/pipelines/${encodeURIComponent(next.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...next, updatedAtMs: Date.now() }),
    });
    if (!r.ok) throw new Error(await r.text());
  };

  useEffect(() => {
    loadPipelineList().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPipelineId) return;
    loadPipelineDoc(selectedPipelineId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPipelineId]);

  const rows = useMemo(() => {
    const nodes = (doc?.nodes ?? []) as any[];
    const out: Array<{
      nodeId: string;
      nodeType: NodeType;
      nodeLabel: string;
      key: string;
      value: unknown;
      secret: boolean;
    }> = [];

    for (const n of nodes) {
      const nodeId = String(n.id ?? '');
      const nodeType = (n?.data?.nodeType ?? n?.type ?? 'oracle-fusion') as NodeType;
      const nodeLabel = String(n?.data?.label ?? NODE_META[nodeType]?.label ?? nodeType);
      const config = (n?.data?.config ?? {}) as Record<string, unknown>;
      for (const key of Object.keys(config).sort()) {
        out.push({
          nodeId,
          nodeType,
          nodeLabel,
          key,
          value: config[key],
          secret: isSecretKey(key),
        });
      }
    }

    const q = filter.trim().toLowerCase();
    if (!q) return out;
    return out.filter((r) =>
      r.nodeLabel.toLowerCase().includes(q) ||
      r.nodeType.toLowerCase().includes(q) ||
      r.key.toLowerCase().includes(q)
    );
  }, [doc, filter]);

  const updateCell = async (nodeId: string, key: string, draft: string) => {
    if (!doc) return;
    const nodes = (doc.nodes ?? []) as any[];
    const idx = nodes.findIndex((n) => String(n.id) === nodeId);
    if (idx < 0) return;

    const current = nodes[idx]?.data?.config?.[key];
    const secret = isSecretKey(key);
    if (secret && draft.trim() === '') {
      setEditing(null);
      return;
    }

    const nextNodes = nodes.map((n, i) => {
      if (i !== idx) return n;
      const next = { ...n, data: { ...(n.data ?? {}) } };
      next.data.config = { ...(next.data.config ?? {}) };
      next.data.config[key] = secret ? draft : parseValue(current, draft);
      return next;
    });

    const nextDoc: SavedPipelineDoc = { ...doc, nodes: nextNodes, updatedAtMs: Date.now() };
    setDoc(nextDoc);
    setEditing(null);
    try {
      setError(null);
      await savePipelineDoc(nextDoc);
      loadPipelineList().catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!beUrl) {
    return (
      <div style={{ padding: '18px', fontFamily: "'Calibri', 'Lato', sans-serif" }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
          Metadata
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Backend not configured. Set <code>VITE_BACKEND_URL</code> (e.g. <code>http://localhost:9000</code>) and restart <code>npm run dev</code>.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: "'Calibri', 'Lato', sans-serif" }}>
      {/* Top controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderBottom: '1.5px solid #e2e8f0',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
          Connection Metadata
        </div>
        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pipeline
          </span>
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            style={{
              height: '30px',
              borderRadius: '6px',
              border: '1.5px solid #e2e8f0',
              backgroundColor: '#ffffff',
              padding: '0 10px',
              fontSize: '12px',
              color: '#1e293b',
              cursor: 'pointer',
              minWidth: '240px',
            }}
          >
            <option value="" disabled>Select pipeline…</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name ? `${p.name} (${p.id})` : p.id}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadPipelineList().catch(() => undefined)}
            title="Refresh pipelines"
            style={{
              height: '30px',
              width: '30px',
              borderRadius: '6px',
              border: '1.5px solid #e2e8f0',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', backgroundColor: '#fff1f2', borderBottom: '1px solid #fecdd3', color: '#b91c1c', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* Filter */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={14} style={{ color: '#94a3b8' }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by node, type, or field…"
            style={{
              flex: 1,
              height: '32px',
              borderRadius: '6px',
              border: '1.5px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '0 10px',
              fontSize: '12px',
              color: '#1e293b',
              outline: 'none',
            }}
          />
          <div style={{ fontSize: '11px', color: '#94a3b8', minWidth: '80px', textAlign: 'right' }}>
            {loading ? 'Loading…' : `${rows.length} rows`}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f8fafc' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {['Node', 'Type', 'Field', 'Value'].map((h) => (
                <th
                  key={h}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    textAlign: 'left',
                    padding: '10px 12px',
                    fontSize: '11px',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                    borderBottom: '1.5px solid #e2e8f0',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isEditing = editing?.nodeId === r.nodeId && editing?.key === r.key;
              const valueText = displayValue(r.key, r.value);
              return (
                <tr key={`${r.nodeId}:${r.key}`}>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', color: '#0f172a', backgroundColor: '#ffffff' }}>
                    {r.nodeLabel}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b', backgroundColor: '#ffffff' }}>
                    {NODE_META[r.nodeType]?.label ?? r.nodeType}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', backgroundColor: '#ffffff', fontFamily: 'Consolas, "Courier New", monospace' }}>
                    {r.key}
                  </td>
                  <td
                    style={{
                      padding: '6px 12px',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: '#ffffff',
                      cursor: 'text',
                    }}
                    onClick={() => {
                      if (r.secret) {
                        setEditing({ nodeId: r.nodeId, key: r.key, draft: '' });
                        return;
                      }
                      setEditing({ nodeId: r.nodeId, key: r.key, draft: valueText });
                    }}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        type={r.secret ? 'password' : 'text'}
                        value={editing?.draft ?? ''}
                        onChange={(e) => setEditing((prev) => (prev ? { ...prev, draft: e.target.value } : prev))}
                        onBlur={() => updateCell(r.nodeId, r.key, editing?.draft ?? '').catch(() => undefined)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateCell(r.nodeId, r.key, editing?.draft ?? '').catch(() => undefined);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        placeholder={r.secret ? 'Enter new value (leave blank to keep)' : ''}
                        style={{
                          width: '100%',
                          height: '30px',
                          borderRadius: '6px',
                          border: '1.5px solid #93c5fd',
                          backgroundColor: '#eff6ff',
                          padding: '0 10px',
                          fontSize: '12px',
                          color: '#0f172a',
                          outline: 'none',
                          fontFamily: r.secret ? "'Calibri', 'Lato', sans-serif" : 'Consolas, "Courier New", monospace',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          minHeight: '18px',
                          fontSize: '12px',
                          color: valueText ? '#0f172a' : '#94a3b8',
                          fontFamily: r.secret ? "'Calibri', 'Lato', sans-serif" : 'Consolas, "Courier New", monospace',
                        }}
                        title={r.secret ? 'Hidden' : valueText}
                      >
                        {valueText || '—'}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '14px 16px', color: '#64748b', fontSize: '12px' }}>
                  No metadata rows for this pipeline.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
