import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, RefreshCw, Search, Trash2 } from 'lucide-react';
import { usePipelineStore } from '../../store/pipelineStore';
import type { NodeType } from '../../types/pipeline';
import { NODE_META } from '../../types/pipeline';
import { BRAND_LOGOS } from './BrandLogos';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

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

const font = { fontFamily: "'Calibri', 'Lato', sans-serif" } as const;

const PALETTE_NODES: Array<{ type: NodeType; description: string }> = [
  { type: 'oracle-fusion', description: 'ERP source database' },
  { type: 'bicc', description: 'Full / incremental extract' },
  { type: 'goldengate', description: 'CDC trail streaming' },
  { type: 'rest-api', description: 'Paginated REST endpoints' },
  { type: 'jdbc', description: 'Spark JDBC direct read' },
  { type: 'cloud-storage', description: 'ADLS Gen2 / S3 staging' },
  { type: 'databricks', description: 'Unity Catalog Delta table' },
];

export function PipelinesSidebar({
  pendingOpenPipelineId,
  onPendingOpenHandled,
}: {
  pendingOpenPipelineId: string | null;
  onPendingOpenHandled: () => void;
}) {
  const beUrl = backendUrl();
  const {
    canvasEditable,
    setCanvasEditable,
    loadPipelineDocument,
    clearCanvas,
    nodes,
    activePipelineName,
  } = usePipelineStore();

  const [pipelines, setPipelines] = useState<PipelineListItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return pipelines;
    return pipelines.filter((p) => (p.name ?? p.id).toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [pipelines, filter]);

  const loadPipelineList = async () => {
    if (!beUrl) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${beUrl}/api/pipelines`);
      if (!r.ok) throw new Error(await r.text());
      const payload = await r.json();
      setPipelines(payload.pipelines ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPipelineDoc = async (id: string) => {
    if (!beUrl) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${beUrl}/api/pipelines/${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error(await r.text());
      const payload = (await r.json()) as SavedPipelineDoc;
      loadPipelineDocument(payload);
      setSelectedId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipelineList().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingOpenPipelineId) return;
    loadPipelineList()
      .catch(() => undefined)
      .finally(() => {
        loadPipelineDoc(pendingOpenPipelineId).catch(() => undefined);
        onPendingOpenHandled();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpenPipelineId]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
        borderRight: '1.5px solid #e2e8f0',
        ...font,
      }}
    >
      <div style={{ padding: '12px 12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 700 }}>Pipelines</div>
          <button
            onClick={() => loadPipelineList().catch(() => undefined)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1.5px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '12px',
              ...font,
            }}
            title="Refresh pipelines"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div style={{ marginTop: '8px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search pipelines…"
            style={{
              width: '100%',
              height: '32px',
              borderRadius: '8px',
              border: '1.5px solid #e2e8f0',
              backgroundColor: '#ffffff',
              padding: '0 10px 0 32px',
              fontSize: '12px',
              color: '#0f172a',
              outline: 'none',
              ...font,
            }}
          />
        </div>

        {error && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 10px', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        {!beUrl && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '8px' }}>
            Backend not configured. Set `VITE_BACKEND_URL` (e.g. `http://localhost:9000`) and restart `npm run dev`.
          </div>
        )}
      </div>

      <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0 12px' }} />

      <div style={{ padding: '10px 10px 8px', overflowY: 'auto' }}>
        {loading && pipelines.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px 6px' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px 6px' }}>No saved pipelines.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.map((p) => {
              const active = selectedId === p.id;
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '8px',
                    border: `1.5px solid ${active ? '#93c5fd' : '#e2e8f0'}`,
                    backgroundColor: active ? '#eff6ff' : '#ffffff',
                    padding: '7px 8px',
                  }}
                >
                  <button
                    onClick={() => {
                      setCanvasEditable(false);
                      loadPipelineDoc(p.id).catch(() => undefined);
                    }}
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      minWidth: 0,
                      ...font,
                    }}
                    title={p.id}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name ?? p.id}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.id}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      const ensureLoaded = selectedId === p.id ? Promise.resolve() : loadPipelineDoc(p.id);
                      ensureLoaded
                        .catch(() => undefined)
                        .finally(() => setCanvasEditable(true));
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      border: '1.5px solid #e2e8f0',
                      backgroundColor: canvasEditable && active ? '#2563eb' : '#ffffff',
                      color: canvasEditable && active ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                    }}
                    title={canvasEditable && active ? 'Editing enabled' : 'Enable editing'}
                    aria-label="Edit pipeline"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0 12px' }} />

      <div style={{ padding: '12px 12px', overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Node Palette</div>
          {!canvasEditable && <div style={{ fontSize: '10px', color: '#94a3b8' }}>View only</div>}
        </div>

        {!canvasEditable && (
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
            Select a pipeline, then click the pencil icon to edit.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {PALETTE_NODES.map((item) => {
            const meta = NODE_META[item.type];
            const Logo = BRAND_LOGOS[item.type];
            const disabled = !canvasEditable;
            return (
              <div
                key={item.type}
                draggable={!disabled}
                onDragStart={(e) => {
                  if (disabled) return;
                  e.dataTransfer.setData('application/reactflow', item.type);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  cursor: disabled ? 'not-allowed' : 'grab',
                  opacity: disabled ? 0.6 : 1,
                  userSelect: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: meta.bgColor,
                    border: `1px solid ${meta.color}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Logo size={15} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 700 }}>{meta.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{item.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '0 12px 12px' }}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={nodes.length === 0 || (!canvasEditable && selectedId !== '')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px',
                borderRadius: '6px',
                fontSize: '12px',
                border: '1.5px solid #e2e8f0',
                backgroundColor: 'transparent',
                color: nodes.length === 0 ? '#cbd5e1' : '#94a3b8',
                cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                ...font,
              }}
              title={nodes.length === 0 ? 'Canvas is empty' : !canvasEditable && selectedId ? 'Enable editing to clear' : 'Clear canvas'}
            >
              <Trash2 size={12} />
              Clear Canvas
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear canvas?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes all nodes and edges from <strong>{(activePipelineName || 'Untitled Pipeline').trim()}</strong>.
                You can save afterwards to update the JSON.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  clearCanvas().catch(() => undefined);
                }}
              >
                Clear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

