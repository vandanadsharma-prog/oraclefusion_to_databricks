import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Save, Shield, Database, Globe, PlugZap, Cloud, Server, Pencil } from 'lucide-react';
import { useConnectionsStore } from '../../store/connectionsStore';
import type { ConnectionInfo, ConnectionType, NodeConfig, ConnectionField } from '../../types/pipeline';

const font = { fontFamily: "'Calibri', 'Lato', sans-serif" } as const;

const TYPE_META: Record<ConnectionType, { label: string; icon: React.ReactNode }> = {
  'oracle-fusion': { label: 'Oracle Fusion', icon: <Database size={14} /> },
  bicc: { label: 'BICC', icon: <PlugZap size={14} /> },
  jdbc: { label: 'JDBC', icon: <Server size={14} /> },
  'cloud-storage': { label: 'ADLS', icon: <Cloud size={14} /> },
  databricks: { label: 'Databricks', icon: <Globe size={14} /> },
  'rest-api': { label: 'REST API', icon: <Globe size={14} /> },
  goldengate: { label: 'Oracle GoldenGate', icon: <PlugZap size={14} /> },
};

const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  borderRadius: 8,
  border: '1.5px solid #e2e8f0',
  padding: '10px 12px',
  fontSize: 12,
  color: '#0f172a',
  outline: 'none',
  ...font,
};

function labeledInput(
  label: string,
  value: string | undefined,
  onChange: (v: string) => void,
  props?: React.InputHTMLAttributes<HTMLInputElement>
) {
  const isDisabled = Boolean(props?.disabled);
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', ...font }}>
        {label}
      </div>
      <input
        {...props}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...FIELD_STYLE,
          background: isDisabled ? '#f1f5f9' : '#ffffff',
          color: isDisabled ? '#94a3b8' : '#0f172a',
          cursor: isDisabled ? 'not-allowed' : 'text',
        }}
      />
    </div>
  );
}

function section(title: string) {
  return (
    <div style={{ margin: '12px 0 6px', fontSize: 11, color: '#2563eb', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', ...font }}>
      {title}
    </div>
  );
}

export function ConnectionsTab({ autoNew }: { autoNew?: boolean }) {
  const { items, selectedId, loading, error, schema, loadConnections, loadSchema, select, saveConnection } = useConnectionsStore();
  const [draft, setDraft] = useState<ConnectionInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    loadConnections().catch(() => undefined);
    loadSchema().catch(() => undefined);
  }, [loadConnections, loadSchema]);

  useEffect(() => {
    if (autoNew) {
      setDraft({
        id: '',
        name: 'New Connection',
        type: 'jdbc',
        config: {},
      });
      select(null);
      setReadOnly(false);
    }
  }, [autoNew, select]);

  useEffect(() => {
    if (!selectedId) return;
    const found = items.find((c) => c.id === selectedId);
    if (found) {
      setDraft(found);
      setReadOnly(true);
    }
  }, [selectedId, items]);

  const filtered = useMemo(() => items.slice().sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0)), [items]);

  const updateConfig = (partial: Partial<NodeConfig>) => {
    setDraft((prev) => (prev ? { ...prev, config: { ...(prev.config ?? {}), ...partial } } : prev));
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const normalizedConfig =
      draft.type === 'rest-api' && !(draft.config as any)?.authType
        ? { ...(draft.config ?? {}), authType: 'token' }
        : draft.config;
    const id = await saveConnection({
      ...draft,
      id: draft.id || undefined,
      type: draft.type,
      name: draft.name,
      config: normalizedConfig,
    });
    setSaving(false);
    if (id) {
      select(id);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', backgroundColor: '#f8fafc', ...font }}>
      {/* Left list */}
      <div style={{ width: 260, borderRight: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Connections</div>
          <button
            onClick={() => loadConnections().catch(() => undefined)}
            title="Refresh"
            style={{ marginLeft: 'auto', border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#64748b' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div style={{ padding: '0 12px 12px' }}>
          <button
            onClick={() => {
              select(null);
              setDraft({ id: '', name: 'New Connection', type: 'jdbc', config: {} });
              setReadOnly(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1.5px dashed #fdba74',
              background: '#fff7ed',
              color: '#c2410c',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Create New Connection
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && <div style={{ fontSize: 12, color: '#94a3b8' }}>Loading…</div>}
          {error && <div style={{ fontSize: 12, color: '#dc2626' }}>{error}</div>}
          {!loading && filtered.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>No connections saved.</div>}
          {filtered.map((c) => {
            const active = selectedId === c.id;
            const meta = TYPE_META[c.type];
            return (
              <button
                key={c.id}
                onClick={() => select(c.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px',
                  borderRadius: 8,
                  border: `1.5px solid ${active ? '#93c5fd' : '#e2e8f0'}`,
                  background: active ? '#eff6ff' : '#fff',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {meta?.icon ?? <Shield size={14} />}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{meta?.label ?? c.type}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, padding: '16px 18px', overflowY: 'auto' }}>
        {draft ? (
          <div style={{ maxWidth: 780, margin: '0 auto', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Connection Details</div>
              {readOnly && (
                <div style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: 999 }}>
                  Read only
                </div>
              )}
              {draft.updatedAtMs && (
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Updated {new Date(draft.updatedAtMs).toLocaleString()}
                </div>
              )}
              {draft.id && (
                <button
                  onClick={() => setReadOnly(false)}
                  disabled={!readOnly}
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1.5px solid #cbd5f5',
                    background: readOnly ? '#eef2ff' : '#f8fafc',
                    color: '#4338ca',
                    fontWeight: 700,
                    cursor: readOnly ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {labeledInput('Connection Name', draft.name, (v) => setDraft((d) => (d ? { ...d, name: v } : d)), { disabled: readOnly })}
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', ...font }}>
                  Type
                </div>
                <select
                  value={draft.type}
                  onChange={(e) => setDraft((d) => (d ? { ...d, type: e.target.value as ConnectionType } : d))}
                  disabled={readOnly}
                  style={{
                    ...FIELD_STYLE,
                    cursor: readOnly ? 'not-allowed' : 'pointer',
                    background: readOnly ? '#f1f5f9' : '#ffffff',
                    color: readOnly ? '#94a3b8' : '#0f172a',
                  }}
                >
                  <option value="jdbc">JDBC</option>
                  <option value="oracle-fusion">Oracle Fusion</option>
                  <option value="bicc">BICC</option>
                  <option value="cloud-storage">ADLS</option>
                  <option value="databricks">Databricks</option>
                  <option value="rest-api">Rest API</option>
                  <option value="goldengate">Oracle GoldenGate</option>
                </select>
              </div>
            </div>

            {draft.type === 'rest-api' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {labeledInput('API Base URL', (draft.config as any)?.baseUrl, (v) => updateConfig({ baseUrl: v }), { disabled: readOnly })}
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', ...font }}>
                    Authentication Type
                  </div>
                  <select
                    value={(draft.config as any)?.authType ?? 'token'}
                    onChange={(e) => updateConfig({ authType: e.target.value as any })}
                    disabled={readOnly}
                    style={{
                      ...FIELD_STYLE,
                      cursor: readOnly ? 'not-allowed' : 'pointer',
                      background: readOnly ? '#f1f5f9' : '#ffffff',
                      color: readOnly ? '#94a3b8' : '#0f172a',
                    }}
                  >
                    <option value="token">Token</option>
                    <option value="basic">Username & Password</option>
                  </select>
                </div>
                {(draft.config as any)?.authType !== 'basic' && (
                  labeledInput('Token Value', (draft.config as any)?.tokenValue, (v) => updateConfig({ tokenValue: v }), { type: 'password', disabled: readOnly })
                )}
                {(draft.config as any)?.authType === 'basic' && (
                  <>
                    {labeledInput('Username', (draft.config as any)?.username, (v) => updateConfig({ username: v }), { disabled: readOnly })}
                    {labeledInput('Password', (draft.config as any)?.password, (v) => updateConfig({ password: v }), { type: 'password', disabled: readOnly })}
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {(schema?.[draft.type]?.fields ?? []).map((f: ConnectionField) => {
                  const value = (draft.config as any)?.[f.key];
                  const type = f.kind === 'password' ? 'password' : f.kind === 'number' ? 'number' : 'text';
                  return (
                    <div key={f.key} style={{ gridColumn: 'span 1' }}>
                      {labeledInput(f.label, value, (v) => updateConfig({ [f.key]: type === 'number' ? Number(v) : v }), {
                        type,
                        placeholder: f.placeholder,
                        disabled: readOnly,
                      })}
                    </div>
                  );
                })}
                {(schema?.[draft.type]?.fields ?? []).length === 0 && (
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    No connection fields required for this type.
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                disabled={saving || readOnly}
                onClick={save}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1.5px solid #fdba74',
                  background: '#fff7ed',
                  color: '#c2410c',
                  fontWeight: 800,
                  cursor: saving || readOnly ? 'not-allowed' : 'pointer',
                  opacity: readOnly ? 0.6 : 1,
                  boxShadow: '0 10px 24px rgba(234,88,12,0.16)',
                }}
              >
                <Save size={14} /> {saving ? 'Saving...' : 'Save Connection'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>
            Select a connection or create a new one to edit its details.
          </div>
        )}
      </div>
    </div>
  );
}
