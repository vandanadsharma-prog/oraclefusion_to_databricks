import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Save, Settings2 } from 'lucide-react';
import { usePipelineStore } from '../../store/pipelineStore';
import type { NodeConfig, NodeType } from '../../types/pipeline';
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
      <Section title="Connection Details" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Field label="Host" value={config.host} onChange={(v) => onChange({ host: v })} placeholder="localhost" />
        <Field label="Port" value={config.port} onChange={(v) => onChange({ port: v })} placeholder="1521" />
      </div>
      <Field label="Service Name" value={config.serviceName} onChange={(v) => onChange({ serviceName: v })} placeholder="ORCLPDB1" />
      <Field label="Username" value={config.username} onChange={(v) => onChange({ username: v })} placeholder="FUSION_USER" />
      <Field label="Password" value={config.password} onChange={(v) => onChange({ password: v })} type="password" />
      <Section title="Source Table" />
      <Field label="Table / View" value={config.table} onChange={(v) => onChange({ table: v })} placeholder="GL_JE_HEADERS" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Field label="Filter Column" value={config.filterColumn} onChange={(v) => onChange({ filterColumn: v })} placeholder="LAST_UPDATE_DATE" />
        <Field label="Filter Value" value={config.filterValue} onChange={(v) => onChange({ filterValue: v })} placeholder="2026-01-01" />
      </div>
    </div>
  );
}

function BiccConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Section title="Export Settings" />
      <SelectField label="Export Format" value={config.format} onChange={(v) => onChange({ format: v as 'csv' | 'parquet' })}
        options={[{ value: 'csv', label: 'CSV (Comma-Separated)' }, { value: 'parquet', label: 'Parquet (columnar)' }]} />
      <SelectField label="Export Type" value={config.exportType} onChange={(v) => onChange({ exportType: v as 'full' | 'incremental' })}
        options={[{ value: 'full', label: 'Full Export' }, { value: 'incremental', label: 'Incremental (lastUpdateDate)' }]} />
      <Section title="Output" />
      <Field label="Output Path" value={config.outputPath} onChange={(v) => onChange({ outputPath: v })} placeholder="./data/bicc/" />
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
      <Section title="GoldenGate Installation" />
      <Field label="Install Path" value={config.installPath} onChange={(v) => onChange({ installPath: v })} placeholder="/opt/goldengate/21c" />
      <Section title="Extract Configuration" />
      <Field label="Extract Name" value={config.extractName} onChange={(v) => onChange({ extractName: v })} placeholder="E_ORA21C" />
      <Field label="Trail File Location" value={config.trailFileLocation} onChange={(v) => onChange({ trailFileLocation: v })} placeholder="/gg/dirdat/aa" />
      <Section title="Replicat Target" />
      <Field label="Replicat Name" value={config.replicatName} onChange={(v) => onChange({ replicatName: v })} placeholder="R_DBX" />
      <SelectField label="Databricks Connector" value={config.databricksConnector} onChange={(v) => onChange({ databricksConnector: v })}
        options={[{ value: 'JDBC', label: 'JDBC / Spark Connector' }, { value: 'REST', label: 'Databricks REST API' }, { value: 'DELTA', label: 'Delta Lake (direct)' }]} />
    </div>
  );
}

function RestApiConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Section title="Endpoint" />
      <Field label="API Base URL" value={config.endpoint} onChange={(v) => onChange({ endpoint: v })} placeholder="http://localhost:8000/fscmRestApi/..." />
      <Section title="Authentication" />
      <SelectField label="Auth Type" value={config.authType} onChange={(v) => onChange({ authType: v as 'oauth2' | 'basic' | 'bearer' })}
        options={[{ value: 'oauth2', label: 'OAuth2 (Client Credentials)' }, { value: 'bearer', label: 'Bearer Token' }, { value: 'basic', label: 'Basic Auth' }]} />
      {(config.authType === 'oauth2' || config.authType === 'basic') && (
        <>
          <Field label="Client ID / Username" value={config.clientId} onChange={(v) => onChange({ clientId: v })} />
          <Field label="Client Secret / Password" value={config.clientSecret} onChange={(v) => onChange({ clientSecret: v })} type="password" />
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
      <Section title="Connection" />
      <Field label="JDBC URL" value={config.jdbcUrl} onChange={(v) => onChange({ jdbcUrl: v })} placeholder="jdbc:oracle:thin:@localhost:1521/ORCLPDB1" />
      <Field label="Username" value={config.username} onChange={(v) => onChange({ username: v })} placeholder="FUSION_USER" />
      <Field label="Password" value={config.password} onChange={(v) => onChange({ password: v })} type="password" />
      <Section title="Query" />
      <TextareaField label="SQL Query" value={config.query} onChange={(v) => onChange({ query: v })}
        placeholder="SELECT * FROM AP_INVOICES_ALL WHERE LAST_UPDATE_DATE > '2026-01-01'" rows={4} />
      <Field label="Pushdown Filter" value={config.pushdownFilter} onChange={(v) => onChange({ pushdownFilter: v })} placeholder="LAST_UPDATE_DATE > '2026-01-01'" />
      <Field label="Fetch Size (rows)" value={config.fetchSize} onChange={(v) => onChange({ fetchSize: Number(v) })} type="number" placeholder="1000" />
    </div>
  );
}

function CloudStorageConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Section title="Storage" />
      <SelectField label="Storage Type" value={config.storageType} onChange={(v) => onChange({ storageType: v as 'adls' | 's3' | 'gcs' | 'local' })}
        options={[{ value: 'adls', label: 'Azure Data Lake Storage Gen2' }, { value: 's3', label: 'Amazon S3' }, { value: 'gcs', label: 'Google Cloud Storage' }, { value: 'local', label: 'Local Filesystem (dev)' }]} />
      <Field label="Container / Bucket" value={config.container} onChange={(v) => onChange({ container: v })} placeholder="oracle-data" />
      <Field label="Path / Prefix" value={config.path} onChange={(v) => onChange({ path: v })} placeholder="/oracle/exports/" />
      <Section title="Credentials" />
      <Field label="Account Name" value={config.accountName} onChange={(v) => onChange({ accountName: v })} placeholder="myadlsaccount" />
      <Field label="Access Key / SAS Token" value={config.accessKey} onChange={(v) => onChange({ accessKey: v })} type="password" />
    </div>
  );
}

function DatabricksConfig({ config, onChange }: { config: NodeConfig; onChange: (c: Partial<NodeConfig>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
        <Field label="Z-ORDER By" value={config.zOrderBy} onChange={(v) => onChange({ zOrderBy: v })} placeholder="id_col" />
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
    if (node) setLocalConfig({ ...node.data.config });
    setSaved(false);
  }, [selectedNodeId]);

  if (!showConfigPanel || !node) return null;

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
      }}
    >
      {/* Header */}
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
