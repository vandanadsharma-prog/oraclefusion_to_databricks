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

type PipelineNode = Node<PipelineNodeData>;

const EDGE_STYLE = {
  stroke: '#94a3b8',
  strokeWidth: 2,
};

export function PipelineCanvas() {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, selectNode, addNode,
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
