import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import type { NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePipelineStore } from '../../store/pipelineStore';
import { NODE_TYPES } from './CustomNodes';
import type { NodeType, PipelineNodeData } from '../../types/pipeline';
import type { Node } from '@xyflow/react';
import { Save } from 'lucide-react';

type PipelineNode = Node<PipelineNodeData>;

const EDGE_STYLE = {
  stroke: '#94a3b8',
  strokeWidth: 2,
};

const PIPELINE_CURSOR_SVG_BASE64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMyAybDcgMjAgMi04IDgtMnoiLz48L3N2Zz4=';

export function PipelineCanvas({ onSaved, onCreateConnection }: { onSaved?: (id: string) => void; onCreateConnection?: () => void }) {
  const {
    workspace,
    canvasEditable,
    hasChanges,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    addNode,
    activePipelineName,
    setActivePipelineName,
    savePipeline,
    activePipelineId,
  } = usePipelineStore();

  const [showNameModal, setShowNameModal] = useState(false);
  const [nameDraft, setNameDraft] = useState(activePipelineName || 'Untitled Pipeline');

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onNodeClick: NodeMouseHandler<PipelineNode> = useCallback((_event, node) => {
    if (!canvasEditable) return;
    selectNode(node.id);
  }, [selectNode, canvasEditable]);

  const onPaneClick = useCallback(() => {
    if (!canvasEditable) return;
    selectNode(null);
  }, [selectNode, canvasEditable]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (!canvasEditable) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [canvasEditable]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (!canvasEditable) return;
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!nodeType) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode, canvasEditable]
  );

  const styledEdges = edges.map((e) => ({
    ...e,
    style: EDGE_STYLE,
    markerEnd: {
      type: 'arrowclosed' as const,
      color: '#94a3b8',
      width: 14,
      height: 14,
    },
  }));

  const showSave =
    (workspace === 'designer' || canvasEditable) &&
    (workspace === 'designer' || Boolean(activePipelineId));

  const saveDisabled = nodes.length === 0 || !hasChanges;

  return (
    <>
    <div ref={reactFlowWrapper} style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={canvasEditable ? onNodesChange : undefined}
        onEdgesChange={canvasEditable ? onEdgesChange : undefined}
        onConnect={canvasEditable ? onConnect : undefined}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={canvasEditable ? onDrop : undefined}
        onDragOver={canvasEditable ? onDragOver : undefined}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.3}
        maxZoom={2}
        deleteKeyCode={canvasEditable ? 'Delete' : null}
        defaultEdgeOptions={{ style: EDGE_STYLE, animated: false }}
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: '#f5f7fa' }}
        nodesDraggable={canvasEditable}
        nodesConnectable={canvasEditable}
        edgesFocusable={canvasEditable}
        elementsSelectable
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="#cbd5e1"
        />
        <Controls
          style={{ backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '6px' }}
        />
        {nodes.length > 5 && (
          <MiniMap
            style={{ backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0' }}
            nodeColor={(node) => {
              const data = node.data as PipelineNodeData;
              if (data.status === 'success') return '#16a34a';
              if (data.status === 'running') return '#2563eb';
              if (data.status === 'error') return '#dc2626';
              return '#cbd5e1';
            }}
            maskColor="rgba(245,247,250,0.7)"
          />
        )}

        {/* Save */}
        {showSave && (
          <div
            style={{
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: nodes.length > 5 ? 155 : 14,
              zIndex: 20,
              pointerEvents: 'auto',
            }}
          >
          <button
            disabled={saveDisabled}
            onClick={() => {
              setNameDraft((activePipelineName || '').trim() || 'Untitled Pipeline');
              setShowNameModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1.5px solid ${saveDisabled ? '#e2e8f0' : '#86efac'}`,
              backgroundColor: saveDisabled ? '#f1f5f9' : '#dcfce7',
              color: saveDisabled ? '#94a3b8' : '#166534',
              fontSize: '12px',
              fontWeight: 600,
              cursor: saveDisabled ? 'not-allowed' : 'pointer',
              boxShadow: saveDisabled ? 'none' : '0 10px 20px rgba(22,101,52,0.12)',
              fontFamily: "'Calibri', 'Lato', sans-serif",
            }}
            title={saveDisabled ? 'Make changes to enable saving' : 'Save pipeline to pipelines/ as JSON'}
          >
            <Save size={14} />
            Save Pipeline
          </button>
        </div>
        )}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center', pointerEvents: 'none',
              fontFamily: "'Calibri', 'Lato', sans-serif",
            }}
          >
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: '600' }}>
              No pipeline configured
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Select an integration template from the left sidebar,
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              or drag nodes from the Node Palette to build a custom pipeline.
            </p>
          </div>
        )}
      </ReactFlow>

      <style>{`
        .react-flow__pane {
          cursor: url("data:image/svg+xml;base64,${PIPELINE_CURSOR_SVG_BASE64}") 0 0, default !important;
        }

        .react-flow__pane:active {
          cursor: url("data:image/svg+xml;base64,${PIPELINE_CURSOR_SVG_BASE64}") 0 0, default !important;
        }

        .react-flow__controls-button {
          background-color: #ffffff !important;
          border-color: #e2e8f0 !important;
          color: #64748b !important;
          fill: #64748b !important;
        }
        .react-flow__controls-button:hover {
          background-color: #f1f5f9 !important;
          color: #1e293b !important;
          fill: #1e293b !important;
        }
        .react-flow__edge.animated .react-flow__edge-path {
          stroke-dasharray: 8 4;
          animation: dashdraw 0.6s linear infinite;
        }
        @keyframes dashdraw {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>

    {showNameModal && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
        }}
        onClick={() => setShowNameModal(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 360,
            background: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 20px 60px rgba(15,23,42,0.18)',
            padding: 18,
            fontFamily: "'Calibri', 'Lato', sans-serif",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Save Pipeline</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Give this pipeline a descriptive name.</div>
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void (async () => {
                  const name = nameDraft.trim() || 'Untitled Pipeline';
                  setActivePipelineName(name);
                  const savedId = await savePipeline().catch(() => null);
                  setShowNameModal(false);
                  if (savedId) onSaved?.(savedId);
                })();
              }
              if (e.key === 'Escape') setShowNameModal(false);
            }}
            style={{
              width: '100%',
              borderRadius: 8,
              border: '1.5px solid #e2e8f0',
              padding: '10px 12px',
              fontSize: 13,
              color: '#0f172a',
              outline: 'none',
              background: '#f8fafc',
              marginBottom: 14,
            }}
            placeholder="Untitled Pipeline"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={() => setShowNameModal(false)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid #e2e8f0',
                background: '#fff',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const name = nameDraft.trim() || 'Untitled Pipeline';
                setActivePipelineName(name);
                const savedId = await savePipeline().catch(() => null);
                setShowNameModal(false);
                if (savedId) onSaved?.(savedId);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1.5px solid #86efac',
                background: '#dcfce7',
                color: '#166534',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(22,101,52,0.12)',
              }}
              disabled={saveDisabled}
            >
              Save
            </button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onCreateConnection}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#2563eb',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Manage connections
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
