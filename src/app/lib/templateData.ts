import type { Node, Edge } from '@xyflow/react';
import type { PipelineNodeData, PipelineType } from '../types/pipeline';

type PipelineNode = Node<PipelineNodeData>;

const defaultNodeState = { status: 'idle' as const, progress: 0, connectionStatus: 'disconnected' as const };

export const TEMPLATES: Record<PipelineType, { nodes: PipelineNode[]; edges: Edge[]; name: string; description: string }> = {
  bicc: {
    name: 'BICC + AutoLoader',
    description: 'Extract via BICC → ADLS Gen2 → Databricks AutoLoader',
    nodes: [
      {
        id: 'oracle-1',
        type: 'oracle-fusion',
        position: { x: 40, y: 180 },
        data: {
          ...defaultNodeState,
          label: 'Oracle Fusion',
          nodeType: 'oracle-fusion',
          subtitle: 'localhost:1521/ORCLPDB1',
          config: {
            host: 'localhost', port: '1521', serviceName: 'ORCLPDB1',
            username: 'FUSION_USER', password: '••••••••',
            table: 'GL_JE_HEADERS', filterColumn: 'LAST_UPDATE_DATE', filterValue: '2026-01-01',
          },
        },
      },
      {
        id: 'bicc-1',
        type: 'bicc',
        position: { x: 320, y: 180 },
        data: {
          ...defaultNodeState,
          label: 'BICC',
          nodeType: 'bicc',
          subtitle: 'Full Export – CSV',
          config: {
            format: 'csv', outputPath: './data/bicc/', schedule: 'immediate', exportType: 'full',
          },
        },
      },
      {
        id: 'storage-1',
        type: 'cloud-storage',
        position: { x: 600, y: 180 },
        data: {
          ...defaultNodeState,
          label: 'Cloud Storage',
          nodeType: 'cloud-storage',
          subtitle: 'ADLS Gen2',
          config: {
            storageType: 'adls', container: 'oracle-data',
            path: '/oracle/exports/', accountName: 'myadlsaccount', accessKey: '••••••••',
          },
        },
      },
      {
        id: 'databricks-1',
        type: 'databricks',
        position: { x: 880, y: 180 },
        data: {
          ...defaultNodeState,
          label: 'Databricks',
          nodeType: 'databricks',
          subtitle: 'unity_catalog.bronze',
          config: {
            workspaceUrl: 'https://adb-123456789.azuredatabricks.net',
            accessToken: 'dapi••••••••', catalog: 'unity_catalog', schema: 'bronze',
            tableName: 'gl_je_headers', writeMode: 'append', zOrderBy: 'journal_date',
          },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'oracle-1', target: 'bicc-1', animated: false },
      { id: 'e2-3', source: 'bicc-1', target: 'storage-1', animated: false },
      { id: 'e3-4', source: 'storage-1', target: 'databricks-1', animated: false },
    ],
  },

  goldengate: {
    name: 'GoldenGate CDC',
    description: 'Oracle GoldenGate → Trail File → Databricks Connector',
    nodes: [
      {
        id: 'oracle-1',
        type: 'oracle-fusion',
        position: { x: 80, y: 200 },
        data: {
          ...defaultNodeState,
          label: 'Oracle Fusion',
          nodeType: 'oracle-fusion',
          subtitle: 'localhost:1521/ORCLPDB1',
          config: {
            host: 'localhost', port: '1521', serviceName: 'ORCLPDB1',
            username: 'FUSION_USER', password: '••••••••',
            table: 'OE_ORDER_HEADERS_ALL', filterColumn: 'LAST_UPDATE_DATE', filterValue: '2026-01-01',
          },
        },
      },
      {
        id: 'gg-1',
        type: 'goldengate',
        position: { x: 420, y: 200 },
        data: {
          ...defaultNodeState,
          label: 'GoldenGate',
          nodeType: 'goldengate',
          subtitle: 'CDC Trail → Databricks',
          config: {
            installPath: '/opt/goldengate/21c', extractName: 'E_ORA21C',
            trailFileLocation: '/gg/dirdat/aa', replicatName: 'R_DBX', databricksConnector: 'JDBC',
          },
        },
      },
      {
        id: 'databricks-1',
        type: 'databricks',
        position: { x: 760, y: 200 },
        data: {
          ...defaultNodeState,
          label: 'Databricks',
          nodeType: 'databricks',
          subtitle: 'unity_catalog.silver',
          config: {
            workspaceUrl: 'https://adb-123456789.azuredatabricks.net',
            accessToken: 'dapi••••••••', catalog: 'unity_catalog', schema: 'silver',
            tableName: 'orders', writeMode: 'merge', zOrderBy: 'order_date',
          },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'oracle-1', target: 'gg-1', animated: false },
      { id: 'e2-3', source: 'gg-1', target: 'databricks-1', animated: false },
    ],
  },

  'rest-api': {
    name: 'Direct REST API',
    description: 'Oracle Fusion REST (fscmRestApi) → Databricks Notebook',
    nodes: [
      {
        id: 'oracle-1',
        type: 'oracle-fusion',
        position: { x: 80, y: 200 },
        data: {
          ...defaultNodeState,
          label: 'Oracle Fusion',
          nodeType: 'oracle-fusion',
          subtitle: 'localhost:9000/fscmRestApi',
          config: {
            host: 'localhost', port: '9000', serviceName: 'ORCLPDB1',
            username: 'FUSION_USER', password: '••••••••',
            table: 'INVOICES', filterColumn: 'lastUpdateDate', filterValue: '2026-01-01',
          },
        },
      },
      {
        id: 'api-1',
        type: 'rest-api',
        position: { x: 420, y: 200 },
        data: {
          ...defaultNodeState,
          label: 'REST API',
          nodeType: 'rest-api',
          subtitle: 'Paginated – OAuth2',
          config: {
            endpoint: 'http://localhost:9000/fscmRestApi/resources/11.13.18.05/invoices',
            authType: 'oauth2', clientId: 'fusion_client_id', clientSecret: '••••••••',
            pageSize: 200, filterParam: 'lastUpdateDate', filterValue: '2026-01-01',
          },
        },
      },
      {
        id: 'databricks-1',
        type: 'databricks',
        position: { x: 760, y: 200 },
        data: {
          ...defaultNodeState,
          label: 'Databricks',
          nodeType: 'databricks',
          subtitle: 'unity_catalog.bronze',
          config: {
            workspaceUrl: 'https://adb-123456789.azuredatabricks.net',
            accessToken: 'dapi••••••••', catalog: 'unity_catalog', schema: 'bronze',
            tableName: 'invoices_api', writeMode: 'append',
          },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'oracle-1', target: 'api-1', animated: false },
      { id: 'e2-3', source: 'api-1', target: 'databricks-1', animated: false },
    ],
  },

  jdbc: {
    name: 'JDBC Direct',
    description: 'Spark JDBC read from Oracle → Delta Table',
    nodes: [
      {
        id: 'oracle-1',
        type: 'oracle-fusion',
        position: { x: 80, y: 200 },
        data: {
          ...defaultNodeState,
          label: 'Oracle Fusion',
          nodeType: 'oracle-fusion',
          subtitle: 'localhost:1521/ORCLPDB1',
          config: {
            host: 'localhost', port: '1521', serviceName: 'ORCLPDB1',
            username: 'FUSION_USER', password: '••••••••',
            table: 'AP_INVOICES_ALL', filterColumn: 'LAST_UPDATE_DATE', filterValue: '2026-01-01',
          },
        },
      },
      {
        id: 'jdbc-1',
        type: 'jdbc',
        position: { x: 420, y: 200 },
        data: {
          ...defaultNodeState,
          label: 'JDBC',
          nodeType: 'jdbc',
          subtitle: 'Spark JDBC – Pushdown',
          config: {
            jdbcUrl: 'jdbc:oracle:thin:@localhost:1521/ORCLPDB1',
            username: 'FUSION_USER', password: '••••••••',
            query: "SELECT * FROM AP_INVOICES_ALL WHERE LAST_UPDATE_DATE > '2026-01-01'",
            pushdownFilter: "LAST_UPDATE_DATE > '2026-01-01'",
            fetchSize: 1000,
          },
        },
      },
      {
        id: 'databricks-1',
        type: 'databricks',
        position: { x: 760, y: 200 },
        data: {
          ...defaultNodeState,
          label: 'Databricks',
          nodeType: 'databricks',
          subtitle: 'unity_catalog.bronze',
          config: {
            workspaceUrl: 'https://adb-123456789.azuredatabricks.net',
            accessToken: 'dapi••••••••', catalog: 'unity_catalog', schema: 'bronze',
            tableName: 'ap_invoices_jdbc', writeMode: 'append', zOrderBy: 'invoice_date',
          },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'oracle-1', target: 'jdbc-1', animated: false },
      { id: 'e2-3', source: 'jdbc-1', target: 'databricks-1', animated: false },
    ],
  },

  custom: {
    name: 'Custom Pipeline',
    description: 'Build your own integration from scratch',
    nodes: [],
    edges: [],
  },
};
