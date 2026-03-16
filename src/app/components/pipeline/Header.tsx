import React from 'react';
import { Database, LayoutGrid, Play, Square, Activity, Terminal, ChevronRight } from 'lucide-react';
import { usePipelineStore } from '../../store/pipelineStore';
import { OracleLogo, DatabricksLogo } from './BrandLogos';

type AppTab = 'designer' | 'metadata';

export function Header({ tab, onTabChange }: { tab: AppTab; onTabChange: (t: AppTab) => void }) {
  const {
    executionStatus,
    executionProgress,
    showExecutionPanel,
    setShowExecutionPanel,
    nodes,
    runPipeline,
    stopPipeline,
  } = usePipelineStore();

  const isRunning = executionStatus === 'running';
  const isSuccess = executionStatus === 'success';
  const isError = executionStatus === 'error';
  const canRun = nodes.length > 0 && !isRunning;

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '14px',
        flexShrink: 0,
        fontFamily: "'Calibri', 'Lato', sans-serif",
      }}
    >
      {/* Brand identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <OracleLogo size={22} />
        <ChevronRight size={14} style={{ color: '#94a3b8' }} />
        <DatabricksLogo size={22} />
        <div style={{ marginLeft: '4px', borderLeft: '1.5px solid #e2e8f0', paddingLeft: '12px' }}>
          <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600', lineHeight: '1.2' }}>
            Fusion Ingest
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.2' }}>
            Oracle Fusion to Databricks Unity Catalog
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {[
          { id: 'designer' as const, label: 'Designer', Icon: LayoutGrid },
          { id: 'metadata' as const, label: 'Metadata', Icon: Database },
        ].map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                border: `1.5px solid ${active ? '#93c5fd' : '#e2e8f0'}`,
                backgroundColor: active ? '#eff6ff' : '#ffffff',
                color: active ? '#2563eb' : '#64748b',
                transition: 'all 0.15s',
                fontFamily: "'Calibri', 'Lato', sans-serif",
              }}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Breadcrumb */}
      {tab === 'designer' && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', color: '#94a3b8',
            borderLeft: '1.5px solid #e2e8f0', paddingLeft: '14px',
          }}
        >
          <span>Pipeline Designer</span>
          <ChevronRight size={11} />
          <span style={{ color: '#64748b' }}>{nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Running progress */}
      {tab === 'designer' && isRunning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={13} style={{ color: '#2563eb' }} />
          <div
            style={{
              width: '140px', height: '5px', backgroundColor: '#e2e8f0',
              borderRadius: '9999px', overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%', width: `${executionProgress}%`,
                backgroundColor: '#2563eb',
                transition: 'width 0.4s ease',
                borderRadius: '9999px',
              }}
            />
          </div>
          <span style={{ fontSize: '11px', color: '#2563eb', minWidth: '28px' }}>
            {executionProgress}%
          </span>
        </div>
      )}

      {/* Logs toggle */}
      {tab === 'designer' && (
        <button
          onClick={() => setShowExecutionPanel(!showExecutionPanel)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px',
            borderRadius: '5px',
            fontSize: '12px', cursor: 'pointer',
            border: `1.5px solid ${showExecutionPanel ? '#2563eb' : '#e2e8f0'}`,
            backgroundColor: showExecutionPanel ? '#eff6ff' : '#ffffff',
            color: showExecutionPanel ? '#2563eb' : '#64748b',
            transition: 'all 0.15s',
            fontFamily: "'Calibri', 'Lato', sans-serif",
          }}
        >
          <Terminal size={13} />
          Execution Logs
        </button>
      )}

      {/* Stop button */}
      {tab === 'designer' && isRunning && (
        <button
          onClick={stopPipeline}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '5px',
            border: '1.5px solid #fca5a5', backgroundColor: '#fef2f2',
            color: '#dc2626', fontSize: '12px', cursor: 'pointer',
            fontFamily: "'Calibri', 'Lato', sans-serif",
          }}
        >
          <Square size={11} />
          Stop
        </button>
      )}

      {/* Run button */}
      {tab === 'designer' && (
        <button
          onClick={runPipeline}
          disabled={!canRun}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '7px 18px', borderRadius: '5px',
            border: 'none',
            backgroundColor: !canRun ? '#e2e8f0' : isSuccess ? '#16a34a' : '#2563eb',
            color: !canRun ? '#94a3b8' : '#ffffff',
            fontSize: '13px', fontWeight: '600',
            cursor: canRun ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            fontFamily: "'Calibri', 'Lato', sans-serif",
            boxShadow: canRun ? '0 1px 4px rgba(37,99,235,0.25)' : 'none',
          }}
        >
          <Play size={13} />
          {isRunning ? 'Running...' : isSuccess ? 'Run Again' : 'Run Pipeline'}
        </button>
      )}

      {/* Status pill */}
      {tab === 'designer' && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '9999px', fontSize: '11px',
            border: `1px solid ${isRunning ? '#93c5fd' : isSuccess ? '#86efac' : isError ? '#fca5a5' : '#e2e8f0'}`,
            backgroundColor: isRunning ? '#eff6ff' : isSuccess ? '#f0fdf4' : isError ? '#fef2f2' : '#f8fafc',
            color: isRunning ? '#2563eb' : isSuccess ? '#16a34a' : isError ? '#dc2626' : '#94a3b8',
            fontFamily: "'Calibri', 'Lato', sans-serif",
          }}
        >
          <div
            style={{
              width: '7px', height: '7px', borderRadius: '50%',
              backgroundColor: isRunning ? '#2563eb' : isSuccess ? '#16a34a' : isError ? '#dc2626' : '#cbd5e1',
            }}
          />
          {isRunning ? 'Running' : isSuccess ? 'Success' : isError ? 'Error' : 'Idle'}
        </div>
      )}
    </header>
  );
}
