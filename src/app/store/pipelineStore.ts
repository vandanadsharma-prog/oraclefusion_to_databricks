import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type {
  PipelineNodeData,
  NodeType,
  NodeStatus,
  LogEntry,
  ExecutionStatus,
  ExecutionSummary,
  PipelineType,
  NodeConfig,
} from '../types/pipeline';
import { SIMULATIONS, EXECUTION_SUMMARIES } from '../lib/simulationData';
import { TEMPLATES } from '../lib/templateData';

type PipelineNode = Node<PipelineNodeData>;

interface PipelineStore {
  nodes: PipelineNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  executionStatus: ExecutionStatus;
  executionProgress: number;
  executionLogs: LogEntry[];
  executionSummary: ExecutionSummary | null;
  activeRunId: string | null;
  activeEventSource: EventSource | null;
  showExecutionPanel: boolean;
  showConfigPanel: boolean;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (id: string | null) => void;
  addNode: (nodeType: NodeType, position: { x: number; y: number }) => void;
  updateNodeConfig: (id: string, config: Partial<NodeConfig>) => void;
  updateNodeStatus: (nodeType: NodeType, status: NodeStatus) => void;
  loadTemplate: (template: PipelineType) => void;
  runPipeline: () => Promise<void>;
  stopPipeline: () => void;
  clearPipeline: () => void;
  setShowExecutionPanel: (show: boolean) => void;
  setShowConfigPanel: (show: boolean) => void;
}

let executionAborted = false;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const generateId = () => Math.random().toString(36).substring(2, 9);
const timestamp = () =>
  new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
  '.' +
  String(Date.now() % 1000).padStart(3, '0');

function backendUrl(): string | null {
  const url = (import.meta as any).env?.VITE_BACKEND_URL as string | undefined;
  return url && url.trim().length > 0 ? url.trim().replace(/\/+$/, '') : null;
}

const DEFAULT_NODE_DATA: Record<NodeType, Partial<PipelineNodeData>> = {
  'oracle-fusion': {
    label: 'Oracle Fusion', nodeType: 'oracle-fusion', subtitle: 'ERP Source Database',
    status: 'idle', progress: 0,
    config: { host: 'localhost', port: '1521', serviceName: 'ORCLPDB1', username: 'FUSION_USER', password: '', table: 'GL_JE_HEADERS', filterColumn: 'LAST_UPDATE_DATE', filterValue: '2026-01-01' },
  },
  bicc: {
    label: 'BICC', nodeType: 'bicc', subtitle: 'Full Export via REST',
    status: 'idle', progress: 0,
    config: { format: 'csv', outputPath: './data/bicc/', schedule: 'immediate', exportType: 'full' },
  },
  goldengate: {
    label: 'GoldenGate', nodeType: 'goldengate', subtitle: 'CDC - Trail to Databricks',
    status: 'idle', progress: 0,
    config: { installPath: '/opt/goldengate/21c', extractName: 'E_ORA21C', trailFileLocation: '/gg/dirdat/aa', replicatName: 'R_DBX', databricksConnector: 'JDBC' },
  },
	  'rest-api': {
	    label: 'REST API', nodeType: 'rest-api', subtitle: 'Paginated - fscmRestApi',
	    status: 'idle', progress: 0,
	    config: { endpoint: 'http://localhost:9000/fscmRestApi/resources/11.13.18.05/invoices', authType: 'oauth2', clientId: 'fusion_client_id', clientSecret: '', pageSize: 200, filterParam: 'lastUpdateDate', filterValue: '2026-01-01' },
	  },
  jdbc: {
    label: 'JDBC', nodeType: 'jdbc', subtitle: 'Direct Spark JDBC Read',
    status: 'idle', progress: 0,
    config: { jdbcUrl: 'jdbc:oracle:thin:@localhost:1521/ORCLPDB1', username: 'FUSION_USER', password: '', query: "SELECT * FROM AP_INVOICES_ALL WHERE LAST_UPDATE_DATE > '2026-01-01'", fetchSize: 1000 },
  },
  'cloud-storage': {
    label: 'Cloud Storage', nodeType: 'cloud-storage', subtitle: 'ADLS Gen2 / S3',
    status: 'idle', progress: 0,
    config: { storageType: 'adls', container: 'oracle-data', path: '/oracle/exports/', accountName: '', accessKey: '' },
  },
  databricks: {
    label: 'Databricks', nodeType: 'databricks', subtitle: 'Unity Catalog - Delta',
    status: 'idle', progress: 0,
    config: { workspaceUrl: 'https://adb-123456789.azuredatabricks.net', accessToken: '', catalog: 'unity_catalog', schema: 'bronze', tableName: 'output_table', writeMode: 'append', zOrderBy: '' },
  },
};

function detectPipelineType(nodes: PipelineNode[]): PipelineType {
  const types = nodes.map((n) => n.data.nodeType);
  if (types.includes('bicc')) return 'bicc';
  if (types.includes('goldengate')) return 'goldengate';
  if (types.includes('rest-api')) return 'rest-api';
  if (types.includes('jdbc')) return 'jdbc';
  return 'custom';
}

export const usePipelineStore = create<PipelineStore>()((set, get) => ({
  nodes: TEMPLATES.bicc.nodes,
  edges: TEMPLATES.bicc.edges,
  selectedNodeId: null,
  executionStatus: 'idle',
  executionProgress: 0,
  executionLogs: [],
  executionSummary: null,
  activeRunId: null,
  activeEventSource: null,
  showExecutionPanel: false,
  showConfigPanel: false,

  onNodesChange: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) as PipelineNode[] }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }));
  },

  onConnect: (connection) => {
    set((state) => ({ edges: addEdge({ ...connection, animated: false }, state.edges) }));
  },

  selectNode: (id) => {
    set({ selectedNodeId: id, showConfigPanel: id !== null });
  },

  addNode: (nodeType, position) => {
    const id = `${nodeType}-${generateId()}`;
    const data = DEFAULT_NODE_DATA[nodeType];
    const newNode: PipelineNode = {
      id,
      type: nodeType,
      position,
      data: { ...data, label: data.label!, nodeType, subtitle: data.subtitle!, config: { ...data.config }, status: 'idle', progress: 0 },
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },

  updateNodeConfig: (id, config) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n
      ),
    }));
  },

  updateNodeStatus: (nodeType, status) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.data.nodeType === nodeType ? { ...n, data: { ...n.data, status } } : n
      ),
    }));
  },

  loadTemplate: (template) => {
    const t = TEMPLATES[template];
    executionAborted = true;
    set({
      nodes: t.nodes.map((n) => ({ ...n, data: { ...n.data, status: 'idle', progress: 0 } })),
      edges: t.edges,
      selectedNodeId: null,
      executionStatus: 'idle',
      executionProgress: 0,
      executionLogs: [],
      executionSummary: null,
      showExecutionPanel: false,
      showConfigPanel: false,
    });
  },

  runPipeline: async () => {
    const { nodes } = get();
    if (nodes.length === 0) return;

    const beUrl = backendUrl();
    if (beUrl) {
      executionAborted = false;
      const pipelineType = detectPipelineType(nodes);
      const startTime = Date.now();

      set((state) => ({
        nodes: state.nodes.map((n) => ({ ...n, data: { ...n.data, status: 'idle', progress: 0 } })),
        edges: state.edges.map((e) => ({ ...e, animated: true })),
        executionStatus: 'running',
        executionProgress: 0,
        executionLogs: [
          { id: generateId(), timestamp: timestamp(), level: 'info', message: '===================================================' },
          { id: generateId(), timestamp: timestamp(), level: 'info', message: `  Pipeline started: ${pipelineType.toUpperCase()} pattern` },
          { id: generateId(), timestamp: timestamp(), level: 'info', message: `  Nodes: ${nodes.length} | Mode: BACKEND` },
          { id: generateId(), timestamp: timestamp(), level: 'info', message: `  Backend: ${beUrl}` },
          { id: generateId(), timestamp: timestamp(), level: 'info', message: '===================================================' },
        ],
        executionSummary: null,
        showExecutionPanel: true,
      }));

      const startResp = await fetch(`${beUrl}/api/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: get().nodes.map((n) => ({ id: n.id, nodeType: n.data.nodeType, config: n.data.config })),
          edges: get().edges,
        }),
      });

      if (!startResp.ok) {
        const errText = await startResp.text();
        set((state) => ({
          executionStatus: 'error',
          edges: state.edges.map((e) => ({ ...e, animated: false })),
          executionLogs: [...state.executionLogs, { id: generateId(), timestamp: timestamp(), level: 'error', message: `[BACKEND] start failed: ${errText}` }],
        }));
        return;
      }

      const { run_id } = await startResp.json();
      const es = new EventSource(`${beUrl}/api/runs/${run_id}/events`);
      set({ activeRunId: run_id, activeEventSource: es });

      es.onmessage = (ev) => {
        if (executionAborted) return;
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch (e) {
          set((state) => ({
            executionLogs: [...state.executionLogs, { id: generateId(), timestamp: timestamp(), level: 'debug', message: `[BACKEND] parse error: ${(e as Error).message}` }],
          }));
          return;
        }

        const event = msg.event;
        const data = msg.data ?? {};

        if (event === 'log') {
          set((state) => ({
            executionLogs: [
              ...state.executionLogs,
              { id: generateId(), timestamp: data.timestamp ?? timestamp(), level: data.level ?? 'info', message: data.message ?? '' },
            ],
          }));
          return;
        }

        if (event === 'progress') {
          set({ executionProgress: Number(data.progress ?? 0) });
          return;
        }

        if (event === 'node_status') {
          set((state) => ({
            nodes: state.nodes.map((n) =>
              n.data.nodeType === data.nodeType ? { ...n, data: { ...n.data, status: data.status } } : n
            ),
          }));
          return;
        }

        if (event === 'summary') {
          const actualTime = Date.now() - startTime;
          set({
            executionSummary: {
              rowsExtracted: Number(data.rowsExtracted ?? 0),
              rowsLoaded: Number(data.rowsLoaded ?? 0),
              timeTakenMs: Number(data.timeTakenMs ?? actualTime),
              pipelineType: data.pipelineType ?? 'custom',
            },
          });
          return;
        }

        if (event === 'done') {
          es.close();
          const doneStatus = data.status === 'success' ? 'success' : 'error';
          const timeTakenMs = get().executionSummary?.timeTakenMs ?? (Date.now() - startTime);
          const rowsExtracted = get().executionSummary?.rowsExtracted ?? 0;
          const rowsLoaded = get().executionSummary?.rowsLoaded ?? 0;

          set((state) => ({
            activeRunId: null,
            activeEventSource: null,
            executionStatus: doneStatus,
            edges: state.edges.map((e) => ({ ...e, animated: false })),
            executionLogs:
              doneStatus === 'success'
                ? [
                    ...state.executionLogs,
                    { id: generateId(), timestamp: timestamp(), level: 'success', message: '===================================================' },
                    { id: generateId(), timestamp: timestamp(), level: 'success', message: `  Pipeline completed successfully in ${(timeTakenMs / 1000).toFixed(1)}s` },
                    { id: generateId(), timestamp: timestamp(), level: 'success', message: `  Rows extracted: ${rowsExtracted.toLocaleString()} | Rows loaded: ${rowsLoaded.toLocaleString()}` },
                    { id: generateId(), timestamp: timestamp(), level: 'success', message: '===================================================' },
                  ]
                : [
                    ...state.executionLogs,
                    { id: generateId(), timestamp: timestamp(), level: 'error', message: `Pipeline failed: ${data.error ?? 'unknown error'}` },
                  ],
          }));
        }
      };

      es.onerror = () => {
        es.close();
        set((state) => ({
          activeRunId: null,
          activeEventSource: null,
          executionStatus: 'error',
          edges: state.edges.map((e) => ({ ...e, animated: false })),
          executionLogs: [...state.executionLogs, { id: generateId(), timestamp: timestamp(), level: 'error', message: '[BACKEND] event stream error / disconnected' }],
        }));
      };

      return;
    }

    executionAborted = false;
    const pipelineType = detectPipelineType(nodes);
    const steps = SIMULATIONS[pipelineType];
    const startTime = Date.now();

    set((state) => ({
      nodes: state.nodes.map((n) => ({ ...n, data: { ...n.data, status: 'idle', progress: 0 } })),
      edges: state.edges.map((e) => ({ ...e, animated: true })),
      executionStatus: 'running',
      executionProgress: 0,
      executionLogs: [
        { id: generateId(), timestamp: timestamp(), level: 'info', message: '===================================================' },
        { id: generateId(), timestamp: timestamp(), level: 'info', message: `  Pipeline started: ${pipelineType.toUpperCase()} pattern` },
        { id: generateId(), timestamp: timestamp(), level: 'info', message: `  Nodes: ${nodes.length} | Mode: SIMULATION` },
        { id: generateId(), timestamp: timestamp(), level: 'info', message: '===================================================' },
      ],
      executionSummary: null,
      showExecutionPanel: true,
    }));

    for (const step of steps) {
      if (executionAborted) return;
      await sleep(step.delayMs);
      if (executionAborted) return;

      set((state) => {
        let newNodes = state.nodes;
        if (step.updateNodeType && step.nodeStatus) {
          newNodes = state.nodes.map((n) =>
            n.data.nodeType === step.updateNodeType
              ? { ...n, data: { ...n.data, status: step.nodeStatus! } }
              : n
          );
        }
        const newLogs = step.log
          ? [...state.executionLogs, { id: generateId(), timestamp: timestamp(), level: step.log.level, message: step.log.message }]
          : state.executionLogs;

        return { nodes: newNodes, executionProgress: step.progress, executionLogs: newLogs };
      });
    }

    if (!executionAborted) {
      const summary = EXECUTION_SUMMARIES[pipelineType];
      const actualTime = Date.now() - startTime;
      set((state) => ({
        executionStatus: 'success',
        executionSummary: { ...summary, timeTakenMs: actualTime },
        edges: state.edges.map((e) => ({ ...e, animated: false })),
        executionLogs: [
          ...state.executionLogs,
          { id: generateId(), timestamp: timestamp(), level: 'success', message: '===================================================' },
          { id: generateId(), timestamp: timestamp(), level: 'success', message: `  Pipeline completed successfully in ${(actualTime / 1000).toFixed(1)}s` },
          { id: generateId(), timestamp: timestamp(), level: 'success', message: `  Rows extracted: ${summary.rowsExtracted.toLocaleString()} | Rows loaded: ${summary.rowsLoaded.toLocaleString()}` },
          { id: generateId(), timestamp: timestamp(), level: 'success', message: '===================================================' },
        ],
      }));
    }
  },

  stopPipeline: () => {
    executionAborted = true;
    const beUrl = backendUrl();
    const { activeRunId, activeEventSource } = get();
    if (activeEventSource) {
      try {
        activeEventSource.close();
      } catch {
        // ignore
      }
    }
    if (beUrl && activeRunId) {
      fetch(`${beUrl}/api/runs/${activeRunId}/stop`, { method: 'POST' }).catch(() => undefined);
    }
    set((state) => ({
      executionStatus: 'idle',
      activeRunId: null,
      activeEventSource: null,
      nodes: state.nodes.map((n) => ({ ...n, data: { ...n.data, status: 'idle', progress: 0 } })),
      edges: state.edges.map((e) => ({ ...e, animated: false })),
      executionLogs: [
        ...state.executionLogs,
        { id: generateId(), timestamp: timestamp(), level: 'warn', message: 'Pipeline execution stopped by user.' },
      ],
    }));
  },

  clearPipeline: () => {
    executionAborted = true;
    const { activeEventSource } = get();
    if (activeEventSource) {
      try {
        activeEventSource.close();
      } catch {
        // ignore
      }
    }
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      executionStatus: 'idle',
      executionProgress: 0,
      executionLogs: [],
      executionSummary: null,
      activeRunId: null,
      activeEventSource: null,
      showExecutionPanel: false,
      showConfigPanel: false,
    });
  },

  setShowExecutionPanel: (show) => set({ showExecutionPanel: show }),
  setShowConfigPanel: (show) => {
    set({ showConfigPanel: show });
    if (!show) set({ selectedNodeId: null });
  },
}));
