import React, { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Header } from './components/pipeline/Header';
import { NodePalette } from './components/pipeline/NodePalette';
import { PipelineCanvas } from './components/pipeline/PipelineCanvas';
import { ConfigPanel } from './components/pipeline/ConfigPanel';
import { ExecutionPanel } from './components/pipeline/ExecutionPanel';
import { ConnectionsTab } from './components/pipeline/ConnectionsTab';
import { PipelinesSidebar } from './components/pipeline/PipelinesSidebar';
import { usePipelineStore } from './store/pipelineStore';
import { useConnectionsStore } from './store/connectionsStore';

type AppTab = 'pipelines' | 'connections' | 'designer';

function AppInner() {
  const { showConfigPanel, resetDraft, switchWorkspace, setCanvasEditable } = usePipelineStore();
  const { loadConnections } = useConnectionsStore();
  const [tab, setTab] = useState<AppTab>('designer');
  const [pendingOpenPipelineId, setPendingOpenPipelineId] = useState<string | null>(null);
  const [autoNewConnection, setAutoNewConnection] = useState(false);

  useEffect(() => {
    const handler = () => {
      setAutoNewConnection(true);
      setTab('connections');
    };
    window.addEventListener('open-connections-new', handler);
    return () => window.removeEventListener('open-connections-new', handler);
  }, []);

  useEffect(() => {
    if (tab === 'designer') {
      switchWorkspace('designer');
      setCanvasEditable(true);
    }
    if (tab === 'pipelines') {
      switchWorkspace('pipelines');
    }
    if (tab === 'connections') {
      loadConnections().catch(() => undefined);
      setAutoNewConnection(false);
    }
  }, [tab, switchWorkspace, setCanvasEditable, loadConnections]);

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
      <Header tab={tab} onTabChange={setTab} />

      {tab === 'connections' ? (
        <ConnectionsTab autoNew={autoNewConnection} />
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left sidebar */}
          <div style={{ width: '248px', flexShrink: 0 }}>
            {tab === 'designer' ? (
              <NodePalette />
            ) : (
              <PipelinesSidebar
                pendingOpenPipelineId={pendingOpenPipelineId}
                onPendingOpenHandled={() => setPendingOpenPipelineId(null)}
              />
            )}
          </div>

          {/* Center: canvas + execution logs */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <PipelineCanvas
                onSaved={(savedId) => {
                  if (tab === 'designer') {
                    resetDraft().catch(() => undefined);
                    setPendingOpenPipelineId(savedId);
                    setTab('pipelines');
                    return;
                  }
                  if (tab === 'pipelines') {
                    setCanvasEditable(false);
                  }
                }}
                onCreateConnection={() => {
                  setAutoNewConnection(true);
                  setTab('connections');
                }}
              />
            </div>
            <ExecutionPanel />
          </div>

          {/* Right: config panel (conditional) */}
          {showConfigPanel && <ConfigPanel />}
        </div>
      )}
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
