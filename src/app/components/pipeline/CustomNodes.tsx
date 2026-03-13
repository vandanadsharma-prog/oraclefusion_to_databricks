import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { CheckCircle2, XCircle, Loader2, Circle, X } from 'lucide-react';
import type { PipelineNodeData, NodeStatus } from '../../types/pipeline';
import { NODE_META } from '../../types/pipeline';
import { BRAND_LOGOS } from './BrandLogos';
import { TRADEOFFS_BY_NODE_TYPE } from '../../lib/tradeoffs';

function StatusBadge({ status }: { status: NodeStatus }) {
  const map: Record<NodeStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    idle: { label: 'Idle', bg: '#f3f4f6', text: '#6b7280', icon: <Circle size={10} /> },
    waiting: { label: 'Waiting', bg: '#fef9c3', text: '#854d0e', icon: <Circle size={10} /> },
    running: { label: 'Running', bg: '#dbeafe', text: '#1d4ed8', icon: <Loader2 size={10} className="animate-spin" /> },
    success: { label: 'Success', bg: '#dcfce7', text: '#15803d', icon: <CheckCircle2 size={10} /> },
    error: { label: 'Error', bg: '#fee2e2', text: '#dc2626', icon: <XCircle size={10} /> },
  };
  const { label, bg, text, icon } = map[status];
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color: text, fontSize: '10px' }}
    >
      {icon}
      <span style={{ fontFamily: "'Calibri', 'Lato', sans-serif" }}>{label}</span>
    </div>
  );
}

function PipelineNode({
  data, selected, isSource, isTarget,
}: NodeProps<PipelineNodeData> & { isSource?: boolean; isTarget?: boolean }) {
  const meta = NODE_META[data.nodeType];
  const Logo = BRAND_LOGOS[data.nodeType];
  const isRunning = data.status === 'running';
  const isSuccess = data.status === 'success';
  const isError = data.status === 'error';

  const tradeoff = useMemo(() => TRADEOFFS_BY_NODE_TYPE[data.nodeType], [data.nodeType]);
  const [showTradeoff, setShowTradeoff] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const openTradeoff = useCallback(() => {
    if (!tradeoff) return;
    setShowTradeoff(true);
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setShowTradeoff(false);
      hideTimerRef.current = null;
    }, 10_000);
  }, [clearHideTimer, tradeoff]);

  useEffect(() => {
    if (!selected) {
      setShowTradeoff(false);
      clearHideTimer();
      return;
    }
    if (tradeoff) openTradeoff();
    return () => {
      clearHideTimer();
    };
  }, [selected, tradeoff, openTradeoff, clearHideTimer]);

  let borderColor = '#e2e8f0';
  if (selected) borderColor = meta.color;
  else if (isRunning) borderColor = meta.color;
  else if (isSuccess) borderColor = '#16a34a';
  else if (isError) borderColor = '#dc2626';

  const boxStyle: React.CSSProperties = {
    width: '220px',
    backgroundColor: '#ffffff',
    border: `1.5px solid ${borderColor}`,
    borderTop: `3px solid ${meta.color}`,
    borderRadius: '6px',
    boxShadow: selected
      ? `0 4px 16px ${meta.color}28, 0 1px 4px rgba(0,0,0,0.10)`
      : '0 1px 6px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s, border-color 0.2s',
    position: 'relative',
    fontFamily: "'Calibri', 'Lato', sans-serif",
  };

  return (
    <div style={{ position: 'relative', width: '220px' }} onClick={openTradeoff}>
      <div style={boxStyle}>
      {/* Running progress bar */}
      {isRunning && (
        <div
          style={{
            position: 'absolute', top: 0, left: 0, height: '3px',
            width: `${data.progress}%`, backgroundColor: meta.color,
            transition: 'width 0.5s ease', zIndex: 10,
          }}
        />
      )}

      {/* Header */}
      <div
        style={{
          backgroundColor: meta.bgColor,
          borderBottom: `1px solid ${meta.color}22`,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#ffffff',
            border: `1px solid ${meta.color}33`,
            borderRadius: '6px',
            flexShrink: 0,
          }}
        >
          <Logo size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '12px', color: '#1e293b',
              fontWeight: '600', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {meta.label}
          </div>
          <div
            style={{
              fontSize: '10px', color: meta.textColor,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {meta.subtitle}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 12px', backgroundColor: '#ffffff' }}>
        {/* Config summary line */}
        <div
          style={{
            fontSize: '10px', color: '#64748b',
            fontFamily: "'Calibri', monospace",
            marginBottom: '8px', minHeight: '14px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {data.nodeType === 'oracle-fusion' && data.config.host &&
            `${data.config.host}:${data.config.port}/${data.config.serviceName}`}
          {data.nodeType === 'bicc' &&
            `Format: ${data.config.format?.toUpperCase()} — ${data.config.exportType}`}
          {data.nodeType === 'goldengate' &&
            `Extract: ${data.config.extractName || 'E_ORA21C'}`}
          {data.nodeType === 'rest-api' &&
            `Auth: ${data.config.authType?.toUpperCase()} — ${data.config.pageSize} rows/page`}
          {data.nodeType === 'jdbc' &&
            (data.config.jdbcUrl?.replace('jdbc:oracle:thin:@', '') || 'JDBC URL not set')}
          {data.nodeType === 'cloud-storage' &&
            `${data.config.storageType?.toUpperCase()} — ${data.config.container || 'container'}`}
          {data.nodeType === 'databricks' &&
            `${data.config.catalog}.${data.config.schema}.${data.config.tableName}`}
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <StatusBadge status={data.status} />
          {isRunning && data.progress > 0 && (
            <span style={{ fontSize: '10px', color: meta.color, fontWeight: '600' }}>
              {data.progress}%
            </span>
          )}
        </div>
      </div>

      {/* Handles */}
      {!isSource && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: 10, height: 10,
            backgroundColor: '#ffffff',
            border: `2px solid ${meta.color}`,
            left: -5,
          }}
        />
      )}
      {!isTarget && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: 10, height: 10,
            backgroundColor: '#ffffff',
            border: `2px solid ${meta.color}`,
            right: -5,
          }}
        />
      )}
      </div>

      {/* Tradeoff bubble (auto-hides in 10s, or via close button) */}
      {showTradeoff && tradeoff && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '320px',
            backgroundColor: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            zIndex: 50,
            overflow: 'hidden',
            pointerEvents: 'auto',
            fontFamily: "'Calibri', 'Lato', sans-serif",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
              Tradeoffs — {tradeoff.tool}
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => {
                setShowTradeoff(false);
                clearHideTimer();
              }}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 2,
                color: '#64748b',
              }}
              aria-label="Close tradeoffs"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ padding: '10px 12px', fontSize: '11px', color: '#334155' }}>
            {[
              ['Layer', tradeoff.layer],
              ['Proximity', tradeoff.proximityToRawData],
              ['Speed/Latency', tradeoff.speedLatency],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '90px', color: '#64748b', fontWeight: 600 }}>{k}</div>
                <div style={{ flex: 1, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
            <div style={{ marginTop: '8px' }}>
              <div style={{ color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                Cost Factors (Indicative)
              </div>
              <div style={{ maxHeight: '140px', overflowY: 'auto', lineHeight: 1.35 }}>
                {tradeoff.costFactors}
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
                Auto-hides in ~10 seconds.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const OracleFusionNode = (props: NodeProps<PipelineNodeData>) => <PipelineNode {...props} isSource />;
export const BiccNode = (props: NodeProps<PipelineNodeData>) => <PipelineNode {...props} />;
export const GoldenGateNode = (props: NodeProps<PipelineNodeData>) => <PipelineNode {...props} />;
export const RestApiNode = (props: NodeProps<PipelineNodeData>) => <PipelineNode {...props} />;
export const JdbcNode = (props: NodeProps<PipelineNodeData>) => <PipelineNode {...props} />;
export const CloudStorageNode = (props: NodeProps<PipelineNodeData>) => <PipelineNode {...props} />;
export const DatabricksNode = (props: NodeProps<PipelineNodeData>) => <PipelineNode {...props} isTarget />;

export const NODE_TYPES = {
  'oracle-fusion': OracleFusionNode,
  bicc: BiccNode,
  goldengate: GoldenGateNode,
  'rest-api': RestApiNode,
  jdbc: JdbcNode,
  'cloud-storage': CloudStorageNode,
  databricks: DatabricksNode,
};
