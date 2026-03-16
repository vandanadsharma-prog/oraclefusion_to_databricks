import React, { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Header } from './components/pipeline/Header';
import { NodePalette } from './components/pipeline/NodePalette';
import { PipelineCanvas } from './components/pipeline/PipelineCanvas';
import { ConfigPanel } from './components/pipeline/ConfigPanel';
import { ExecutionPanel } from './components/pipeline/ExecutionPanel';
import { usePipelineStore } from './store/pipelineStore';

function AppInner() {
  const { showConfigPanel, savePipeline } = usePipelineStore();

  useEffect(() => {
    savePipeline().catch(() => undefined);
  }, [savePipeline]);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Calibri', 'Lato', 'Carlito', 'Segoe UI', Arial, sans-serif",
      }}
    >
      <Header />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar */}
        <div style={{ width: '248px', flexShrink: 0 }}>
          <NodePalette />
        </div>

        {/* Center: canvas + execution logs */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <PipelineCanvas />
          </div>
          <ExecutionPanel />
        </div>

        {/* Right: config panel (conditional) */}
        {showConfigPanel && <ConfigPanel />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
