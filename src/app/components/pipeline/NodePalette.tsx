import React from 'react';
import { Download, Zap, Globe, Link2, Trash2, LayoutTemplate, Layers } from 'lucide-react';
import type { NodeType, PipelineType } from '../../types/pipeline';
import { NODE_META } from '../../types/pipeline';
import { usePipelineStore } from '../../store/pipelineStore';
import { BRAND_LOGOS, OracleLogo, DatabricksLogo, AzureLogo, JavaLogo } from './BrandLogos';

interface PaletteNodeItem { type: NodeType; description: string }

const PALETTE_NODES: PaletteNodeItem[] = [
  { type: 'oracle-fusion', description: 'ERP source database' },
  { type: 'bicc', description: 'Full / incremental extract' },
  { type: 'goldengate', description: 'CDC trail streaming' },
  { type: 'rest-api', description: 'Paginated REST endpoints' },
  { type: 'jdbc', description: 'Spark JDBC direct read' },
  { type: 'cloud-storage', description: 'ADLS Gen2 / S3 staging' },
  { type: 'databricks', description: 'Unity Catalog Delta table' },
];

interface TemplateItem {
  type: PipelineType; name: string; description: string;
  color: string; nodeTypes: NodeType[];
}

const TEMPLATES_LIST: TemplateItem[] = [
  { type: 'bicc', name: 'BICC + AutoLoader', description: 'BICC → ADLS → AutoLoader → Delta', color: '#1E88E5', nodeTypes: ['oracle-fusion', 'bicc', 'cloud-storage', 'databricks'] },
  { type: 'goldengate', name: 'GoldenGate CDC', description: 'GoldenGate → Trail → Databricks', color: '#C87D00', nodeTypes: ['oracle-fusion', 'goldengate', 'databricks'] },
  { type: 'rest-api', name: 'Direct REST API', description: 'fscmRestApi → Paginated → Delta', color: '#16A34A', nodeTypes: ['oracle-fusion', 'rest-api', 'databricks'] },
  { type: 'jdbc', name: 'JDBC Direct', description: 'Spark JDBC → Pushdown → Delta', color: '#9333EA', nodeTypes: ['oracle-fusion', 'jdbc', 'databricks'] },
];

const sectionLabel = (icon: React.ReactNode, title: string) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px', marginBottom: '8px' }}>
    <span style={{ color: '#94a3b8' }}>{icon}</span>
    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
      {title}
    </span>
  </div>
);

export function NodePalette() {
  const { loadTemplate, clearPipeline } = usePipelineStore();

  const onDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto',
        backgroundColor: '#f8fafc', borderRight: '1.5px solid #e2e8f0',
        fontFamily: "'Calibri', 'Lato', sans-serif",
      }}
    >
      {/* Integration Templates */}
      <div style={{ padding: '14px 12px 10px' }}>
        {sectionLabel(<LayoutTemplate size={12} />, 'Integration Templates')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {TEMPLATES_LIST.map((tmpl) => {
            const nodeLogos = tmpl.nodeTypes.map((nt) => ({ nt, Logo: BRAND_LOGOS[nt] }));
            return (
              <button
                key={tmpl.type}
                onClick={() => loadTemplate(tmpl.type)}
                style={{
                  textAlign: 'left', borderRadius: '6px', padding: '10px 11px',
                  backgroundColor: '#ffffff', border: `1.5px solid #e2e8f0`,
                  cursor: 'pointer', transition: 'all 0.15s', width: '100%',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = tmpl.color;
                  el.style.backgroundColor = NODE_META[tmpl.nodeTypes[0]].bgColor;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = '#e2e8f0';
                  el.style.backgroundColor = '#ffffff';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                  <div style={{ width: '4px', height: '14px', borderRadius: '2px', backgroundColor: tmpl.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{tmpl.name}</span>
                </div>
                <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px', paddingLeft: '11px' }}>{tmpl.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '11px' }}>
                  {nodeLogos.map(({ nt, Logo }) => (
                    <div
                      key={nt}
                      title={NODE_META[nt].label}
                      style={{
                        width: '20px', height: '20px', borderRadius: '4px',
                        backgroundColor: NODE_META[nt].bgColor,
                        border: `1px solid ${NODE_META[nt].color}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Logo size={12} />
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '2px 12px' }} />

      {/* Node Palette */}
      <div style={{ padding: '12px 12px', flex: 1 }}>
        {sectionLabel(<Layers size={12} />, 'Node Palette')}
        <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '10px', paddingLeft: '4px' }}>
          Drag nodes onto the canvas to build a custom pipeline
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {PALETTE_NODES.map((item) => {
            const meta = NODE_META[item.type];
            const Logo = BRAND_LOGOS[item.type];
            return (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => onDragStart(e, item.type)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  borderRadius: '6px', padding: '8px 10px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  cursor: 'grab',
                  userSelect: 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = meta.color;
                  el.style.backgroundColor = meta.bgColor;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = '#e2e8f0';
                  el.style.backgroundColor = '#ffffff';
                }}
              >
                <div
                  style={{
                    width: '28px', height: '28px', borderRadius: '5px',
                    backgroundColor: meta.bgColor,
                    border: `1px solid ${meta.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Logo size={15} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{meta.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{item.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clear */}
      <div style={{ padding: '0 12px 12px' }}>
        <button
          onClick={clearPipeline}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', padding: '7px', borderRadius: '5px', fontSize: '12px',
            border: '1.5px solid #e2e8f0', backgroundColor: 'transparent', color: '#94a3b8',
            cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: "'Calibri', 'Lato', sans-serif",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = '#fca5a5';
            el.style.backgroundColor = '#fef2f2';
            el.style.color = '#dc2626';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = '#e2e8f0';
            el.style.backgroundColor = 'transparent';
            el.style.color = '#94a3b8';
          }}
        >
          <Trash2 size={12} />
          Clear Canvas
        </button>
      </div>
    </div>
  );
}
