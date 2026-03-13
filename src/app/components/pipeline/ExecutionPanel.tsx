import React, { useEffect, useRef } from 'react';
import { X, CheckCircle2, XCircle, Info, AlertTriangle, Terminal, BarChart2 } from 'lucide-react';
import { usePipelineStore } from '../../store/pipelineStore';
import type { LogLevel } from '../../types/pipeline';

const fontStyle = { fontFamily: "'Calibri', 'Lato', monospace" };

function LogIcon({ level }: { level: LogLevel }) {
  switch (level) {
    case 'success': return <CheckCircle2 size={11} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />;
    case 'error': return <XCircle size={11} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />;
    case 'warn': return <AlertTriangle size={11} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />;
    case 'debug': return <Info size={11} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '2px' }} />;
    default: return <span style={{ width: '11px', height: '11px', flexShrink: 0, marginTop: '2px', display: 'inline-block' }} />;
  }
}

function logColor(level: LogLevel): string {
  switch (level) {
    case 'success': return '#15803d';
    case 'error': return '#dc2626';
    case 'warn': return '#92400e';
    case 'debug': return '#94a3b8';
    default: return '#334155';
  }
}

export function ExecutionPanel() {
  const {
    executionLogs, executionStatus, executionProgress,
    executionSummary, showExecutionPanel, setShowExecutionPanel,
  } = usePipelineStore();

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executionLogs]);

  if (!showExecutionPanel) return null;

  const isRunning = executionStatus === 'running';
  const isSuccess = executionStatus === 'success';
  const isError = executionStatus === 'error';

  const borderTopColor = isRunning ? '#2563eb' : isSuccess ? '#16a34a' : isError ? '#dc2626' : '#e2e8f0';

  return (
    <div
      style={{
        height: '270px', flexShrink: 0, display: 'flex', flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderTop: `2px solid ${borderTopColor}`,
        transition: 'border-color 0.3s ease',
        fontFamily: "'Calibri', 'Lato', sans-serif",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 16px', flexShrink: 0,
          backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Terminal size={13} style={{ color: '#64748b' }} />
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Execution Logs
        </span>

        {(isRunning || isSuccess) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div style={{ flex: 1, height: '5px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%', width: `${executionProgress}%`,
                  backgroundColor: isSuccess ? '#16a34a' : '#2563eb',
                  transition: 'width 0.4s ease', borderRadius: '9999px',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', minWidth: '28px' }}>{executionProgress}%</span>
          </div>
        )}

        {/* Status badge */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '600',
            border: `1px solid ${isRunning ? '#93c5fd' : isSuccess ? '#86efac' : isError ? '#fca5a5' : '#e2e8f0'}`,
            backgroundColor: isRunning ? '#eff6ff' : isSuccess ? '#f0fdf4' : isError ? '#fef2f2' : '#f8fafc',
            color: isRunning ? '#2563eb' : isSuccess ? '#15803d' : isError ? '#dc2626' : '#94a3b8',
          }}
        >
          {isRunning && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb', animation: 'pulse 1s infinite' }} />}
          {isRunning ? 'Running' : isSuccess ? 'Success' : isError ? 'Error' : 'Idle'}
        </div>

        <button
          onClick={() => setShowExecutionPanel(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Logs + Summary */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Log output */}
        <div
          style={{
            flex: 1, overflowY: 'auto', padding: '10px 16px',
            backgroundColor: '#fafafa',
            fontFamily: 'Consolas, "Courier New", monospace',
          }}
        >
          {executionLogs.map((log) => (
            <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginBottom: '2px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0, fontFamily: 'monospace', marginTop: '2px' }}>
                {log.timestamp}
              </span>
              <LogIcon level={log.level} />
              <span style={{ fontSize: '11px', color: logColor(log.level), fontFamily: 'Consolas, "Courier New", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {log.message}
              </span>
            </div>
          ))}
          {isRunning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '2px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{new Date().toLocaleTimeString('en-US', { hour12: false })}.000</span>
              <span style={{ fontSize: '11px', color: '#2563eb', animation: 'pulse 0.8s infinite' }}>|</span>
            </div>
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Summary panel */}
        {executionSummary && isSuccess && (
          <div
            style={{
              width: '220px', flexShrink: 0, padding: '14px',
              borderLeft: '1.5px solid #e2e8f0', backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <BarChart2 size={13} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Run Summary
              </span>
            </div>
            {[
              { label: 'Rows Extracted', value: executionSummary.rowsExtracted.toLocaleString(), color: '#2563eb' },
              { label: 'Rows Loaded', value: executionSummary.rowsLoaded.toLocaleString(), color: '#16a34a' },
              { label: 'Duration', value: `${(executionSummary.timeTakenMs / 1000).toFixed(1)}s`, color: '#d97706' },
              { label: 'Pattern', value: executionSummary.pipelineType.toUpperCase(), color: '#7c3aed' },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: item.color }}>
                  {item.value}
                </div>
              </div>
            ))}
            <div
              style={{
                borderRadius: '5px', padding: '8px 10px', fontSize: '11px', color: '#15803d',
                backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              }}
            >
              All rows verified in Delta table
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
