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
import { TEMPLATES } from '../lib/templateData';

type PipelineNode = Node<PipelineNodeData>;
type Workspace = 'designer' | 'pipelines';

type WorkspaceSnapshot = {
  nodes: PipelineNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  activePipelineId: string | null;
  activePipelineName: string;
  showConfigPanel: boolean;
  canvasEditable: boolean;
};

interface PipelineStore {
  workspace: Workspace;
  canvasEditable: boolean;
  autoSaveEnabled: boolean;
  workspaceSnapshots: Record<Workspace, WorkspaceSnapshot>;
  hasChanges: boolean;

  nodes: PipelineNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  activePipelineId: string | null;
  activePipelineName: string;
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
  connectNode: (id: string) => Promise<void>;
  disconnectNode: (id: string) => void;
  setActivePipelineName: (name: string) => void;
  savePipeline: () => Promise<string | null>;
  loadPipelineDocument: (doc: { id: string; name?: string; nodes: any[]; edges: any[] }) => void;
  clearCanvas: () => Promise<void>;
  resetDraft: () => Promise<void>;
  setCanvasEditable: (editable: boolean) => void;
  switchWorkspace: (workspace: Workspace) => void;
  setShowExecutionPanel: (show: boolean) => void;
  setShowConfigPanel: (show: boolean) => void;
}

let executionAborted = false;
let saveTimer: number | null = null;

const generateId = () => Math.random().toString(36).substring(2, 9);
const timestamp = () =>
  new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
  '.' +
  String(Date.now() % 1000).padStart(3, '0');

function backendUrl(): string | null {
  const url = (import.meta as any).env?.VITE_BACKEND_URL as string | undefined;
  if (url && url.trim().length > 0) return url.trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:9000';
  }
  return null;
}

const DEFAULT_NODE_DATA: Record<NodeType, Partial<PipelineNodeData>> = {
  'oracle-fusion': {
    label: 'Oracle Fusion', nodeType: 'oracle-fusion', subtitle: 'ERP Source Database',
    connectionStatus: 'disconnected', status: 'idle', progress: 0,
    config: { host: 'localhost', port: '1521', serviceName: 'PDB2', username: 'PDB_ADMIN', password: '', table: 'GL_BALANCE_FACT', filterColumn: 'LAST_UPDATE_DATE', filterValue: '2026-01-01' },
  },
  bicc: {
    label: 'BICC', nodeType: 'bicc', subtitle: 'Full Export via REST',
    connectionStatus: 'disconnected', status: 'idle', progress: 0,
    config: { format: 'csv', outputPath: './data/bicc/', schedule: 'immediate', exportType: 'full' },
  },
  goldengate: {
    label: 'GoldenGate', nodeType: 'goldengate', subtitle: 'CDC - Trail to Databricks',
    connectionStatus: 'disconnected', status: 'idle', progress: 0,
    config: { installPath: '/opt/goldengate/21c', extractName: 'E_ORA21C', trailFileLocation: '/gg/dirdat/aa', replicatName: 'R_DBX', databricksConnector: 'JDBC' },
  },
		  'rest-api': {
		    label: 'REST API', nodeType: 'rest-api', subtitle: 'Paginated - fscmRestApi',
		    connectionStatus: 'disconnected', status: 'idle', progress: 0,
		    config: { endpoint: 'http://localhost:9000/fscmRestApi/resources/11.13.18.05/invoices', authType: 'oauth2', clientId: 'fusion_client_id', clientSecret: '', pageSize: 200, filterParam: 'lastUpdateDate', filterValue: '2026-01-01' },
		  },
  jdbc: {
    label: 'JDBC', nodeType: 'jdbc', subtitle: 'Direct Spark JDBC Read',
    connectionStatus: 'disconnected', status: 'idle', progress: 0,
    config: { jdbcUrl: 'jdbc:oracle:thin:@localhost:1521/PDB2', username: 'PDB_ADMIN', password: '', query: "SELECT * FROM AP_INVOICES_ALL WHERE LAST_UPDATE_DATE > '2026-01-01'", fetchSize: 1000 },
  },
  'cloud-storage': {
    label: 'Cloud Storage', nodeType: 'cloud-storage', subtitle: 'ADLS Gen2 / S3',
    connectionStatus: 'disconnected', status: 'idle', progress: 0,
    config: { storageType: 'adls', container: 'oracle-data', path: '/oracle/exports/', accountName: '', accessKey: '' },
  },
  databricks: {
    label: 'Databricks', nodeType: 'databricks', subtitle: 'Unity Catalog - Delta',
    connectionStatus: 'disconnected', status: 'idle', progress: 0,
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

function newPipelineId(prefix: string) {
  return `${prefix}-${Date.now()}-${generateId()}`;
}

function scheduleSave(get: () => PipelineStore) {
  if (!get().autoSaveEnabled) return;
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    get().savePipeline().catch(() => undefined);
  }, 800);
}

function serializeNodes(nodes: PipelineNode[]) {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));
}

export const usePipelineStore = create<PipelineStore>()((set, get) => ({
  workspace: 'designer',
  canvasEditable: true,
  autoSaveEnabled: false,
  workspaceSnapshots: {
    designer: {
      nodes: [],
      edges: [],
      selectedNodeId: null,
      activePipelineId: null,
      activePipelineName: 'Untitled Pipeline',
      showConfigPanel: false,
      canvasEditable: true,
    },
    pipelines: {
      nodes: [],
      edges: [],
      selectedNodeId: null,
      activePipelineId: null,
      activePipelineName: 'Untitled Pipeline',
      showConfigPanel: false,
      canvasEditable: false,
    },
  },
  hasChanges: false,

  nodes: [],
  edges: [],
  selectedNodeId: null,
  activePipelineId: null,
  activePipelineName: 'Untitled Pipeline',
  executionStatus: 'idle',
  executionProgress: 0,
  executionLogs: [],
  executionSummary: null,
  activeRunId: null,
  activeEventSource: null,
  showExecutionPanel: false,
  showConfigPanel: false,

  onNodesChange: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) as PipelineNode[], hasChanges: true }));
    scheduleSave(get);
  },

  onEdgesChange: (changes) => {
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges), hasChanges: true }));
    scheduleSave(get);
  },

  onConnect: (connection) => {
    set((state) => ({ edges: addEdge({ ...connection, animated: false }, state.edges), hasChanges: true }));
    scheduleSave(get);
  },

  selectNode: (id) => {
    if (!get().canvasEditable) {
      set({ selectedNodeId: null, showConfigPanel: false });
      return;
    }
    set({ selectedNodeId: id, showConfigPanel: id !== null });
  },

  addNode: (nodeType, position) => {
    const needsPipeline = get().activePipelineId === null;
    if (needsPipeline) {
      set({ activePipelineId: newPipelineId('custom'), activePipelineName: 'Custom Pipeline' });
    }
    const id = `${nodeType}-${generateId()}`;
    const data = DEFAULT_NODE_DATA[nodeType];
    const newNode: PipelineNode = {
      id,
      type: nodeType,
      position,
      data: {
        ...data,
        label: data.label!,
        nodeType,
        subtitle: data.subtitle!,
        config: { ...data.config },
        connectionStatus: (data.connectionStatus as any) ?? 'disconnected',
        status: 'idle',
        progress: 0,
      },
    };
    set((state) => ({ nodes: [...state.nodes, newNode], hasChanges: true }));
    scheduleSave(get);
  },

  updateNodeConfig: (id, config) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                config: { ...n.data.config, ...config },
                connectionStatus: 'disconnected',
                connectionError: undefined,
              },
            }
          : n
      ),
      hasChanges: true,
    }));
    scheduleSave(get);
  },

  updateNodeStatus: (nodeType, status) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.data.nodeType === nodeType ? { ...n, data: { ...n.data, status } } : n
      ),
      hasChanges: true,
    }));
  },

  loadTemplate: (template) => {
    const t = TEMPLATES[template];
    executionAborted = true;
    set({
      nodes: t.nodes.map((n) => ({ ...n, data: { ...n.data, status: 'idle', progress: 0 } })),
      edges: t.edges,
      selectedNodeId: null,
      activePipelineId: newPipelineId(template),
      activePipelineName: t.name,
      executionStatus: 'idle',
      executionProgress: 0,
      executionLogs: [],
      executionSummary: null,
      showExecutionPanel: false,
      showConfigPanel: false,
      canvasEditable: true,
      hasChanges: true,
    });
    scheduleSave(get);
  },

  runPipeline: async () => {
    const { nodes } = get();
    if (nodes.length === 0) return;

	    const beUrl = backendUrl();
	    if (!beUrl) {
	      set((state) => ({
	        executionStatus: 'error',
	        executionProgress: 0,
	        showExecutionPanel: true,
	        edges: state.edges.map((e) => ({ ...e, animated: false })),
	        executionLogs: [
	          { id: generateId(), timestamp: timestamp(), level: 'error', message: 'Backend not configured.' },
	          { id: generateId(), timestamp: timestamp(), level: 'info', message: 'Set VITE_BACKEND_URL (e.g. http://localhost:9000) and restart `npm run dev`.' },
	        ],
	      }));
	      return;
	    }

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

	      let startResp: Response;
	      try {
	        startResp = await fetch(`${beUrl}/api/runs`, {
	          method: 'POST',
	          headers: { 'Content-Type': 'application/json' },
	          body: JSON.stringify({
	            nodes: get().nodes.map((n) => ({ id: n.id, nodeType: n.data.nodeType, config: n.data.config })),
	            edges: get().edges,
	          }),
	        });
	      } catch (e) {
	        set((state) => ({
	          executionStatus: 'error',
	          edges: state.edges.map((ed) => ({ ...ed, animated: false })),
	          executionLogs: [
	            ...state.executionLogs,
	            { id: generateId(), timestamp: timestamp(), level: 'error', message: `[BACKEND] network error: ${(e as Error).message}` },
	          ],
	        }));
	        return;
	      }

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

		  },

  connectNode: async (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;

    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, connectionStatus: 'connecting', connectionError: undefined } } : n
      ),
      hasChanges: true,
    }));

    const beUrl = backendUrl();
    if (!beUrl) {
      set((state) => ({
        showExecutionPanel: true,
        executionLogs: [
          ...state.executionLogs,
          { id: generateId(), timestamp: timestamp(), level: 'error', message: `[CONNECT] Backend not configured for ${node.data.nodeType}.` },
          { id: generateId(), timestamp: timestamp(), level: 'info', message: 'Set VITE_BACKEND_URL (e.g. http://localhost:9000) and restart `npm run dev`.' },
        ],
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, connectionStatus: 'error', connectionError: 'backend_not_configured' } } : n
        ),
        hasChanges: true,
      }));
      scheduleSave(get);
      return;
    }

    let resp: Response;
    try {
      resp = await fetch(`${beUrl}/api/connections/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeType: node.data.nodeType, config: node.data.config }),
      });
    } catch (e) {
      const msg = (e as Error).message;
      set((state) => ({
        showExecutionPanel: true,
        executionLogs: [...state.executionLogs, { id: generateId(), timestamp: timestamp(), level: 'error', message: `[CONNECT] network error: ${msg}` }],
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, connectionStatus: 'error', connectionError: msg } } : n
        ),
        hasChanges: true,
      }));
      scheduleSave(get);
      return;
    }

    let payload: any = null;
    try {
      payload = await resp.json();
    } catch {
      payload = null;
    }

    const ok = Boolean(payload?.ok) && resp.ok;
    const message = String(payload?.message ?? (resp.ok ? 'ok' : 'error'));

    if (ok) {
      set((state) => ({
        executionLogs: [...state.executionLogs, { id: generateId(), timestamp: timestamp(), level: 'success', message: `[CONNECT] ${node.data.nodeType}: ${message}` }],
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, connectionStatus: 'connected', connectionError: undefined } } : n
        ),
        hasChanges: true,
      }));
      scheduleSave(get);
      return;
    }

    set((state) => ({
      showExecutionPanel: true,
      executionLogs: [...state.executionLogs, { id: generateId(), timestamp: timestamp(), level: 'error', message: `[CONNECT] ${node.data.nodeType} failed: ${message}` }],
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, connectionStatus: 'error', connectionError: message } } : n
      ),
      hasChanges: true,
    }));
    scheduleSave(get);
  },

  disconnectNode: (id) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, connectionStatus: 'disconnected', connectionError: undefined } } : n
      ),
      hasChanges: true,
    }));
    scheduleSave(get);
  },

  setActivePipelineName: (name) => {
    set({ activePipelineName: name, hasChanges: true });
    scheduleSave(get);
  },

  savePipeline: async () => {
    const beUrl = backendUrl();
    if (!beUrl) return null;
    let { activePipelineId, activePipelineName } = get();
    const { nodes, edges } = get();
    if (!activePipelineId) {
      activePipelineId = newPipelineId(nodes.length ? detectPipelineType(nodes) : 'custom');
      set({ activePipelineId });
    }
    if (!activePipelineName || !activePipelineName.trim()) {
      activePipelineName = 'Untitled Pipeline';
      set({ activePipelineName });
    }

    const resp = await fetch(`${beUrl}/api/pipelines/${activePipelineId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: activePipelineId,
        name: activePipelineName,
        nodes: serializeNodes(nodes),
        edges,
        updatedAtMs: Date.now(),
      }),
    }).catch(() => undefined);

    if (resp?.ok) {
      set({ hasChanges: false });
    }

    return activePipelineId;
  },

  loadPipelineDocument: (doc) => {
    executionAborted = true;
    const { activeEventSource } = get();
    if (activeEventSource) {
      try {
        activeEventSource.close();
      } catch {
        // ignore
      }
    }
    const loadedNodes = (doc.nodes ?? []).map((n: any) => ({
      ...n,
      data: { ...(n.data ?? {}), status: 'idle', progress: 0 },
    })) as PipelineNode[];
    set({
      nodes: loadedNodes,
      edges: (doc.edges ?? []) as Edge[],
      selectedNodeId: null,
      activePipelineId: doc.id ?? null,
      activePipelineName: (doc.name ?? 'Untitled Pipeline') as string,
      executionStatus: 'idle',
      executionProgress: 0,
      executionLogs: [],
      executionSummary: null,
      activeRunId: null,
      activeEventSource: null,
      showExecutionPanel: false,
      showConfigPanel: false,
      canvasEditable: false,
      hasChanges: false,
    });
  },

  clearCanvas: async () => {
    executionAborted = true;
    if (saveTimer !== null) {
      window.clearTimeout(saveTimer);
      saveTimer = null;
    }

    const beUrl = backendUrl();
    const { activeEventSource, activeRunId } = get();
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
      // keep pipeline id/name so "clear canvas" clears components but doesn't delete pipeline
      canvasEditable: state.workspace === 'designer' ? true : state.canvasEditable,
      hasChanges: true,
    }));
  },

  resetDraft: async () => {
    if (get().workspace !== 'designer') return;
    await get().clearCanvas();
    set((state) => ({
      activePipelineId: null,
      activePipelineName: 'Untitled Pipeline',
      canvasEditable: true,
      workspaceSnapshots: {
        ...state.workspaceSnapshots,
        designer: {
          ...state.workspaceSnapshots.designer,
          nodes: [],
          edges: [],
          selectedNodeId: null,
          activePipelineId: null,
          activePipelineName: 'Untitled Pipeline',
          showConfigPanel: false,
          canvasEditable: true,
        },
      },
      hasChanges: false,
    }));
  },

  setCanvasEditable: (editable) => {
    set({
      canvasEditable: editable,
      selectedNodeId: editable ? get().selectedNodeId : null,
      showConfigPanel: editable ? get().showConfigPanel : false,
    });
  },

  switchWorkspace: (workspace) => {
    const { activeEventSource } = get();
    if (activeEventSource) {
      try {
        activeEventSource.close();
      } catch {
        // ignore
      }
    }

    const current = get();
    if (current.workspace === workspace) return;

    const nextSnapshots = { ...current.workspaceSnapshots };

    nextSnapshots[current.workspace] = {
      nodes: current.nodes,
      edges: current.edges,
      selectedNodeId: current.selectedNodeId,
      activePipelineId: current.activePipelineId,
      activePipelineName: current.activePipelineName,
      showConfigPanel: current.showConfigPanel,
      canvasEditable: current.workspace === 'designer' ? true : current.canvasEditable,
    };

    const incoming = nextSnapshots[workspace] ?? {
      nodes: [],
      edges: [],
      selectedNodeId: null,
      activePipelineId: null,
      activePipelineName: 'Untitled Pipeline',
      showConfigPanel: false,
      canvasEditable: workspace === 'designer',
    };

    set({
      workspace,
      nodes: incoming.nodes,
      edges: incoming.edges,
      selectedNodeId: incoming.selectedNodeId,
      activePipelineId: incoming.activePipelineId,
      activePipelineName: incoming.activePipelineName,
      showConfigPanel: incoming.showConfigPanel,
      canvasEditable: workspace === 'designer' ? true : Boolean(incoming.canvasEditable),
      workspaceSnapshots: nextSnapshots,
      hasChanges: false,
      executionStatus: 'idle',
      executionProgress: 0,
      executionLogs: [],
      executionSummary: null,
      activeRunId: null,
      activeEventSource: null,
      showExecutionPanel: false,
    });
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

  setShowExecutionPanel: (show) => set({ showExecutionPanel: show }),
  setShowConfigPanel: (show) => {
    set({ showConfigPanel: show });
    if (!show) set({ selectedNodeId: null });
  },
}));
