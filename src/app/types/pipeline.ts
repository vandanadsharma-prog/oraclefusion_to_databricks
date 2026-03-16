export type NodeType =
  | 'oracle-fusion'
  | 'bicc'
  | 'goldengate'
  | 'rest-api'
  | 'jdbc'
  | 'cloud-storage'
  | 'databricks';

export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';
export type PipelineType = 'bicc' | 'goldengate' | 'rest-api' | 'jdbc' | 'custom';
export type LogLevel = 'info' | 'success' | 'error' | 'warn' | 'debug';
export type ConnectionType = 'jdbc' | 'oracle-fusion' | 'bicc' | 'cloud-storage' | 'databricks';

export interface NodeConfig {
  // Oracle Fusion
  host?: string;
  port?: string;
  serviceName?: string;
  username?: string;
  password?: string;
  table?: string;
  filterColumn?: string;
  filterValue?: string;
  // BICC
  format?: 'csv' | 'parquet';
  outputPath?: string;
  schedule?: 'immediate' | 'cron';
  cronExpression?: string;
  exportType?: 'full' | 'incremental';
  // GoldenGate
  installPath?: string;
  extractName?: string;
  trailFileLocation?: string;
  replicatName?: string;
  databricksConnector?: string;
  // REST API
  endpoint?: string;
  authType?: 'oauth2' | 'basic' | 'bearer';
  clientId?: string;
  clientSecret?: string;
  pageSize?: number;
  filterParam?: string;
  // JDBC
  jdbcUrl?: string;
  query?: string;
  pushdownFilter?: string;
  fetchSize?: number;
  // Cloud Storage
  storageType?: 'adls' | 's3' | 'gcs' | 'local';
  container?: string;
  path?: string;
  accountName?: string;
  accessKey?: string;
  // Databricks
  workspaceUrl?: string;
  accessToken?: string;
  catalog?: string;
  schema?: string;
  tableName?: string;
  writeMode?: 'append' | 'overwrite' | 'merge';
  partitionBy?: string;
  zOrderBy?: string;
}

export interface PipelineNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  subtitle: string;
  config: NodeConfig;
  connectionStatus: ConnectionStatus;
  connectionError?: string;
  status: NodeStatus;
  progress: number;
  rowsProcessed?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface ExecutionSummary {
  rowsExtracted: number;
  rowsLoaded: number;
  timeTakenMs: number;
  pipelineType: PipelineType;
}

export interface ConnectionInfo {
  id: string;
  name: string;
  type: ConnectionType;
  config: NodeConfig;
  updatedAtMs?: number;
}

export type ConnectionField = {
  key: string;
  label: string;
  kind?: 'text' | 'password' | 'number';
  placeholder?: string;
};

export type ConnectionSchema = Partial<Record<ConnectionType, { fields: ConnectionField[] }>>;

export const NODE_META: Record<NodeType, { label: string; subtitle: string; color: string; bgColor: string; textColor: string }> = {
  'oracle-fusion': {
    label: 'Oracle Fusion',
    subtitle: 'ERP Source Database',
    color: '#C74634',
    bgColor: '#fef2f2',
    textColor: '#7f1d1d',
  },
  bicc: {
    label: 'BICC',
    subtitle: 'Full Export via REST',
    color: '#1E88E5',
    bgColor: '#eff6ff',
    textColor: '#1e3a5f',
  },
  goldengate: {
    label: 'Oracle GoldenGate',
    subtitle: 'CDC – Trail to Databricks',
    color: '#C87D00',
    bgColor: '#fffbeb',
    textColor: '#78350f',
  },
  'rest-api': {
    label: 'REST API',
    subtitle: 'Paginated – fscmRestApi',
    color: '#16A34A',
    bgColor: '#f0fdf4',
    textColor: '#14532d',
  },
  jdbc: {
    label: 'JDBC Connection',
    subtitle: 'Direct Spark JDBC Read',
    color: '#9333EA',
    bgColor: '#faf5ff',
    textColor: '#4c1d95',
  },
  'cloud-storage': {
    label: 'Cloud Storage',
    subtitle: 'Azure ADLS Gen2',
    color: '#0078D4',
    bgColor: '#eff8ff',
    textColor: '#1e3a5f',
  },
  databricks: {
    label: 'Databricks',
    subtitle: 'Unity Catalog – Delta Table',
    color: '#FF3621',
    bgColor: '#fff7f7',
    textColor: '#7f1d1d',
  },
};
