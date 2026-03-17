import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Save } from 'lucide-react';
import { usePipelineStore } from '../../store/pipelineStore';
import { useConnectionsStore } from '../../store/connectionsStore';
import type { NodeConfig, NodeType, ConnectionType } from '../../types/pipeline';
import { NODE_META } from '../../types/pipeline';
import { BRAND_LOGOS } from './BrandLogos';

const fontStyle = { fontFamily: "'Calibri', 'Lato', sans-serif" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', ...fontStyle }}>
      {children}
    </label>
  );
}

const inputBase: React.CSSProperties = {
  width: '100%', borderRadius: '4px', padding: '6px 10px',
  fontSize: '12px', color: '#1e293b', outline: 'none',
  border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc',
  transition: 'border-color 0.15s', ...fontStyle,
};

function ConnectionPicker({
  type,
  config,
  onApply,
}: {
  type: ConnectionType;
  config: NodeConfig;
  onApply: (cfg: NodeConfig) => void;
}) {
  const { items, loadConnections } = useConnectionsStore();
  const matches = items.filter((c) => c.type === type);
  const selectedId = config.connectionId ?? '';
  const CONNECTION_KEYS: Record<ConnectionType, Array<keyof NodeConfig>> = {
    'oracle-fusion': ['host', 'port', 'serviceName', 'username', 'password'],
    'cloud-storage': ['accountName', 'accessKey'],
    databricks: ['workspaceUrl', 'accessToken'],
    jdbc: ['jdbcUrl', 'username', 'password'],
    'rest-api': ['baseUrl', 'authType', 'tokenValue', 'username', 'password'],
    bicc: [],
    goldengate: [],
  };

  useEffect(() => {
    if (items.length === 0) {
      loadConnections().catch(() => undefined);
    }
  }, [items.length, loadConnections]);

  return (
    <div>
      <FieldLabel>Connection</FieldLabel>
      <select
        value={selectedId}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '__new__') {
            window.dispatchEvent(new CustomEvent('open-connections-new'));
            return;
          }
          const conn = matches.find((c) => c.id === val);
          const next: NodeConfig = { connectionId: val || undefined };
          if (conn) {
            const keys = CONNECTION_KEYS[type] ?? [];
            for (const k of keys) {
              if (conn.config && (conn.config as any)[k] !== undefined) {
                (next as any)[k] = (conn.config as any)[k];
              }
            }
          }
          onApply(next);
        }}
        style={{ ...inputBase, cursor: 'pointer', boxSizing: 'border-box' }}
        onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.backgroundColor = '#ffffff'; }}
        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
      >
        <option value="">Select existing</option>
        {matches.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
        <option value="__new__">Create new connection...</option>
      </select>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder = '',
}: {
  label: string; value: string | number | undefined; onChange?: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputBase, paddingRight: isPassword ? '30px' : undefined, boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.backgroundColor = '#ffffff'; }}
          onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
        />
        {isPassword && (
          <button
            onClick={() => setShow(!show)}
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string | undefined; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBase, boxSizing: 'border-box', cursor: 'pointer' }}
        onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.backgroundColor = '#ffffff'; }}
        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3, placeholder = '' }: {
  label: string; value: string | undefined; onChange: (v: string) => void;
  rows?: number; placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{ ...inputBase, resize: 'none', boxSizing: 'border-box' }}
        onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.backgroundColor = '#ffffff'; }}
        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
      />
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div style={{ paddingTop: '14px', marginBottom: '8px' }}>
      <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', ...fontStyle }}>{title}</div>
      <div style={{ height: '1px', backgroundColor: '#e2e8f0' }} />
    </div>
  );
}

function OracleFusionConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ConnectionPicker type="oracle-fusion" config={config} onApply={(cfg) => onChange(cfg)} />
      <Section title="Connection Details" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Field label="Host" value={config.host} onChange={(v) => onChange({ host: v })} placeholder="localhost" />
        <Field label="Port" value={config.port} onChange={(v) => onChange({ port: v })} placeholder="1521" />
      </div>
      <Field label="Service Name" value={config.serviceName} onChange={(v) => onChange({ serviceName: v })} placeholder="PDB2" />
      <Field label="Username" value={config.username} onChange={(v) => onChange({ username: v })} placeholder="PDB_ADMIN" />
      <Field label="Password" value={config.password} onChange={(v) => onChange({ password: v })} type="password" />
      <Section title="Source Table" />
      <Field label="Table / View" value={config.table} onChange={(v) => onChange({ table: v })} placeholder="GL_BALANCE_FACT" />
      <Field label="Select Columns" value={config.selectColumns} onChange={(v) => onChange({ selectColumns: v })} placeholder="* or col1,col2" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Field label="Filter Column" value={config.filterColumn} onChange={(v) => onChange({ filterColumn: v })} placeholder="LAST_UPDATE_DATE" />
        <Field label="Limit Rows" value={config.limitRows} onChange={(v) => onChange({ limitRows: Number(v) })} placeholder="10000" type="number" />
      </div>
    </div>
  );
}

function BiccConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ConnectionPicker type="bicc" config={config} onApply={(cfg) => onChange(cfg)} />
      <Section title="Export Settings" />
      <SelectField label="Export Format" value={config.format} onChange={(v) => onChange({ format: v as 'csv' | 'parquet' })}
        options={[{ value: 'csv', label: 'CSV (Comma-Separated)' }, { value: 'parquet', label: 'Parquet (columnar)' }]} />
      <SelectField label="Export Type" value={config.exportType} onChange={(v) => onChange({ exportType: v as 'full' | 'incremental' })}
        options={[{ value: 'full', label: 'Full Export' }, { value: 'incremental', label: 'Incremental (lastUpdateDate)' }]} />
      <Section title="Output" />
      <Field label="Output Path" value={config.outputPath} onChange={(v) => onChange({ outputPath: v })} placeholder=".\\data\\bicc\\" />
      <SelectField label="Schedule" value={config.schedule} onChange={(v) => onChange({ schedule: v as 'immediate' | 'cron' })}
        options={[{ value: 'immediate', label: 'Immediate (on-demand)' }, { value: 'cron', label: 'Cron schedule' }]} />
      {config.schedule === 'cron' && (
        <Field label="Cron Expression" value={config.cronExpression} onChange={(v) => onChange({ cronExpression: v })} placeholder="0 2 * * *" />
      )}
    </div>
  );
}

function GoldenGateConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ConnectionPicker type="goldengate" config={config} onApply={(cfg) => onChange(cfg)} />
      <Section title="Configuration" />
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
        No additional parameters required for GoldenGate in this UI.
      </div>
    </div>
  );
}

function RestApiConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ConnectionPicker type="rest-api" config={config} onApply={(cfg) => onChange(cfg)} />
      <Section title="API Base" />
      <Field label="API Base URL" value={config.baseUrl} onChange={(v) => onChange({ baseUrl: v })} placeholder="https://api.example.com" />
      <Section title="Authentication" />
      <SelectField label="Auth Type" value={config.authType} onChange={(v) => onChange({ authType: v as 'token' | 'basic' })}
        options={[{ value: 'token', label: 'Token' }, { value: 'basic', label: 'Username & Password' }]} />
      {config.authType === 'token' && (
        <Field label="Token Value" value={config.tokenValue} onChange={(v) => onChange({ tokenValue: v })} type="password" />
      )}
      {config.authType === 'basic' && (
        <>
          <Field label="Username" value={config.username} onChange={(v) => onChange({ username: v })} />
          <Field label="Password" value={config.password} onChange={(v) => onChange({ password: v })} type="password" />
        </>
      )}
      <Section title="Pagination and Filters" />
      <Field label="Page Size" value={config.pageSize} onChange={(v) => onChange({ pageSize: Number(v) })} placeholder="200" type="number" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Field label="Filter Param" value={config.filterParam} onChange={(v) => onChange({ filterParam: v })} placeholder="lastUpdateDate" />
        <Field label="Filter Value" value={config.filterValue} onChange={(v) => onChange({ filterValue: v })} placeholder="2026-01-01" />
      </div>
    </div>
  );
}

function JdbcConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ConnectionPicker type="jdbc" config={config} onApply={(cfg) => onChange(cfg)} />
      <Section title="Connection" />
      <Field label="JDBC URL" value={config.jdbcUrl} onChange={(v) => onChange({ jdbcUrl: v })} placeholder="jdbc:oracle:thin:@localhost:1521/PDB2" />
      <Field label="Username" value={config.username} onChange={(v) => onChange({ username: v })} placeholder="PDB_ADMIN" />
      <Field label="Password" value={config.password} onChange={(v) => onChange({ password: v })} type="password" />
      <Section title="Query" />
      <TextareaField label="SQL Query" value={config.query} onChange={(v) => onChange({ query: v })}
        placeholder="SELECT * FROM AP_INVOICES_ALL WHERE LAST_UPDATE_DATE > '2026-01-01'" rows={4} />
      <Field label="Row Limit" value={config.rowLimit} onChange={(v) => onChange({ rowLimit: Number(v) })} type="number" placeholder="1000" />
    </div>
  );
}

function CloudStorageConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ConnectionPicker type="cloud-storage" config={config} onApply={(cfg) => onChange(cfg)} />
      <Section title="Storage" />
      <Field label="Container Name" value={config.container} onChange={(v) => onChange({ container: v })} placeholder="oracle-data" />
      <Field label="Path / Prefix" value={config.path} onChange={(v) => onChange({ path: v })} placeholder="/oracle/exports/" />
      <Field label="File Extension Filter" value={config.fileExtensionFilter} onChange={(v) => onChange({ fileExtensionFilter: v })} placeholder=".csv" />
    </div>
  );
}

function DatabricksConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ConnectionPicker type="databricks" config={config} onApply={(cfg) => onChange(cfg)} />
      <Section title="Workspace" />
      <Field label="Workspace URL" value={config.workspaceUrl} onChange={(v) => onChange({ workspaceUrl: v })} placeholder="https://adb-xxx.azuredatabricks.net" />
      <Field label="Personal Access Token" value={config.accessToken} onChange={(v) => onChange({ accessToken: v })} type="password" placeholder="dapi..." />
      <Section title="Unity Catalog Target" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <Field label="Catalog" value={config.catalog} onChange={(v) => onChange({ catalog: v })} placeholder="unity_catalog" />
        <Field label="Schema" value={config.schema} onChange={(v) => onChange({ schema: v })} placeholder="bronze" />
        <Field label="Table" value={config.tableName} onChange={(v) => onChange({ tableName: v })} placeholder="output" />
      </div>
      <Section title="Delta Options" />
      <SelectField label="Write Mode" value={config.writeMode} onChange={(v) => onChange({ writeMode: v as 'append' | 'overwrite' | 'merge' })}
        options={[{ value: 'append', label: 'Append (incremental)' }, { value: 'overwrite', label: 'Overwrite (full reload)' }, { value: 'merge', label: 'Merge / Upsert (CDC)' }]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Field label="Partition By" value={config.partitionBy} onChange={(v) => onChange({ partitionBy: v })} placeholder="date_col" />
        <Field label="Re-Order By" value={config.reorderBy} onChange={(v) => onChange({ reorderBy: v })} placeholder="id_col" />
      </div>
    </div>
  );
}

const CONFIG_COMPONENTS: Partial<Record<NodeType, React.ComponentType<{ config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }>>> = {
  'oracle-fusion': OracleFusionConfig,
  bicc: BiccConfig,
  goldengate: GoldenGateConfig,
  'rest-api': RestApiConfig,
  jdbc: JdbcConfig,
  'cloud-storage': CloudStorageConfig,
  databricks: DatabricksConfig,
};

export function ConfigPanel() {
  const { nodes, selectedNodeId, showConfigPanel, updateNodeConfig, setShowConfigPanel } = usePipelineStore();
  const [localConfig, setLocalConfig] = useState<NodeConfig>({});
  const [saved, setSaved] = useState(false);

  const node = nodes.find((n) => n.id === selectedNodeId);

  useEffect(() => {
    if (node) {
      setLocalConfig({ ...node.data.config });
    }
    setSaved(false);
  }, [selectedNodeId, node]);

  if (!showConfigPanel || !node) return null;

  // Prepare render helpers for Node Config
  const meta = NODE_META[node.data.nodeType];
  const Logo = BRAND_LOGOS[node.data.nodeType];
  const ConfigComponent = CONFIG_COMPONENTS[node.data.nodeType];

  const handleChange = (partial: Partial<NodeConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...partial }));
    setSaved(false);
  };

  const handleSave = () => {
    if (selectedNodeId) {
      updateNodeConfig(selectedNodeId, localConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div
      style={{
        width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%',
        backgroundColor: '#ffffff', borderLeft: '1.5px solid #e2e8f0',
        fontFamily: "'Calibri', 'Lato', sans-serif",
        boxShadow: '-2px 0 5px rgba(0,0,0,0.02)'
      }}
    >
      {/* Header (Node) */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
          backgroundColor: meta.bgColor, borderBottom: `1.5px solid ${meta.color}22`, flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '32px', height: '32px', borderRadius: '6px',
            backgroundColor: '#ffffff', border: `1px solid ${meta.color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Logo size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{meta.label}</div>
          <div style={{ fontSize: '10px', color: meta.textColor }}>{meta.subtitle}</div>
        </div>
        <button
          onClick={() => setShowConfigPanel(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Node ID */}
      <div style={{ padding: '6px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Node: {selectedNodeId}</span>
      </div>

      {/* Config form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px' }}>
        {ConfigComponent ? (
          <ConfigComponent config={localConfig} onChange={handleChange} />
        ) : (
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '16px' }}>No configuration available for this node type.</p>
        )}
      </div>

      {/* Save button */}
      <div style={{ padding: '12px 16px', borderTop: '1.5px solid #e2e8f0', flexShrink: 0 }}>
        <button
          onClick={handleSave}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '7px', padding: '8px', borderRadius: '5px', fontSize: '13px', fontWeight: '600',
            border: `1.5px solid ${saved ? '#86efac' : '#bfdbfe'}`,
            backgroundColor: saved ? '#f0fdf4' : '#eff6ff',
            color: saved ? '#15803d' : '#2563eb',
            cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: "'Calibri', 'Lato', sans-serif",
          }}
        >
          <Save size={13} />
          {saved ? 'Configuration Saved' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
