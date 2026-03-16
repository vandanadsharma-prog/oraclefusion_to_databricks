import React, { useCallback, useRef } from 'react';
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

export function PipelineCanvas() {
  const {
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
  } = usePipelineStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onNodeClick: NodeMouseHandler<PipelineNode> = useCallback((_event, node) => {
    selectNode(node.id);
  }, [selectNode]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!nodeType) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
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

  return (
    <div ref={reactFlowWrapper} style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.3}
        maxZoom={2}
        deleteKeyCode="Delete"
        defaultEdgeOptions={{ style: EDGE_STYLE, animated: false }}
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: '#f5f7fa' }}
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
        <div
          style={{
            position: 'absolute',
            right: 12,
            bottom: nodes.length > 5 ? 155 : 12,
            zIndex: 20,
            pointerEvents: 'auto',
          }}
        >
          <button
            disabled={nodes.length === 0}
            onClick={() => {
              const current = (activePipelineName || '').trim() || 'Untitled Pipeline';
              const typed = window.prompt('Pipeline name', current);
              if (typed === null) return;
              const name = typed.trim();
              if (!name) return;
              setActivePipelineName(name);
              savePipeline().catch(() => undefined);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1.5px solid #e2e8f0',
              backgroundColor: nodes.length === 0 ? '#f1f5f9' : '#ffffff',
              color: nodes.length === 0 ? '#94a3b8' : '#64748b',
              fontSize: '12px',
              fontWeight: 600,
              cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
              fontFamily: "'Calibri', 'Lato', sans-serif",
            }}
            title={nodes.length === 0 ? 'Add nodes to enable saving' : 'Save pipeline to pipelines/ as JSON'}
          >
            <Save size={14} />
            Save Pipeline
          </button>
        </div>

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
  );
}
