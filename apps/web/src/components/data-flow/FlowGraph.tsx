'use client';

export type NodeId =
  | 'agent' | 'policy' | 'model' | 'response' | 'client'
  | 'audit' | 'postgres' | 'alert' | 'governance';

interface NodeDef {
  id: NodeId;
  cx: number;
  cy: number;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
}

interface EdgeDef {
  id: string;
  d: string;
  color: string;
  dur: number;
}

const NW = 120;
const NH = 58;
const RR = 8;

const NODES: NodeDef[] = [
  { id: 'agent',      cx: 70,  cy: 160, label: 'AI Agent',        sublabel: 'Request source',    color: '#2563EB', bg: '#EFF6FF' },
  { id: 'policy',     cx: 235, cy: 160, label: 'Policy Engine',    sublabel: '8 active policies', color: '#D97706', bg: '#FFFBEB' },
  { id: 'model',      cx: 410, cy: 160, label: 'AI Model',         sublabel: 'Claude · GPT-4',    color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'response',   cx: 585, cy: 160, label: 'Response Filter',  sublabel: 'Output validation', color: '#059669', bg: '#ECFDF5' },
  { id: 'client',     cx: 750, cy: 160, label: 'Client Output',    sublabel: 'Governed response', color: '#374151', bg: '#F9FAFB' },
  { id: 'audit',      cx: 235, cy: 305, label: 'Audit Logger',     sublabel: 'Event capture',     color: '#2563EB', bg: '#EFF6FF' },
  { id: 'postgres',   cx: 410, cy: 305, label: 'PostgreSQL',       sublabel: '+ TimescaleDB',     color: '#059669', bg: '#ECFDF5' },
  { id: 'alert',      cx: 585, cy: 305, label: 'Alert System',     sublabel: 'Violation alerts',  color: '#DC2626', bg: '#FEF2F2' },
  { id: 'governance', cx: 750, cy: 305, label: 'Governance',       sublabel: 'KPIs & reports',    color: '#7C3AED', bg: '#F5F3FF' },
];

// Edge paths connect node boundary edges, not centers.
// Node right edge = cx+60, left = cx-60, top = cy-29, bottom = cy+29
const EDGES: EdgeDef[] = [
  { id: 'e1', d: 'M130,160 L175,160',                   color: '#2563EB', dur: 0.7 },  // Agent → Policy
  { id: 'e2', d: 'M295,160 L350,160',                   color: '#D97706', dur: 0.7 },  // Policy → Model
  { id: 'e3', d: 'M470,160 L525,160',                   color: '#7C3AED', dur: 0.7 },  // Model → Response
  { id: 'e4', d: 'M645,160 L690,160',                   color: '#059669', dur: 0.7 },  // Response → Client
  { id: 'e5', d: 'M235,189 L235,276',                   color: '#D97706', dur: 1.1 },  // Policy → Audit (vertical)
  { id: 'e6', d: 'M410,189 C410,237 295,237 295,276',   color: '#7C3AED', dur: 1.4 },  // Model → Audit (bezier)
  { id: 'e7', d: 'M295,305 L350,305',                   color: '#2563EB', dur: 0.9 },  // Audit → PostgreSQL
  { id: 'e8', d: 'M470,305 L525,305',                   color: '#059669', dur: 1.1 },  // PostgreSQL → Alert
  { id: 'e9', d: 'M645,305 L690,305',                   color: '#DC2626', dur: 0.9 },  // Alert → Governance
];

const LEGEND = [
  { color: '#2563EB', label: 'Request flow' },
  { color: '#D97706', label: 'Governance events' },
  { color: '#7C3AED', label: 'AI inference log' },
  { color: '#059669', label: 'Persistence / metrics' },
  { color: '#DC2626', label: 'Violation alerts' },
];

export default function FlowGraph({
  selectedNode,
  onNodeClick,
  animated,
}: {
  selectedNode: NodeId | null;
  onNodeClick: (id: NodeId) => void;
  animated: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 830 390" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <marker
            id="arrowGray"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#D1D5DB" />
          </marker>
        </defs>

        {/* Row labels */}
        <text x="10" y="100" fontSize={10} fontWeight="700" fill="#9CA3AF"
          style={{ fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          REQUEST PIPELINE
        </text>
        <text x="10" y="248" fontSize={10} fontWeight="700" fill="#9CA3AF"
          style={{ fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          GOVERNANCE LAYER
        </text>

        {/* Edges */}
        {EDGES.map((edge) => (
          <g key={edge.id}>
            <path
              d={edge.d}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={3}
              markerEnd="url(#arrowGray)"
            />
            {animated && (
              <path
                d={edge.d}
                fill="none"
                stroke={edge.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="8 6"
                strokeDashoffset="0"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-14"
                  dur={`${edge.dur}s`}
                  repeatCount="indefinite"
                />
              </path>
            )}
          </g>
        ))}

        {/* Nodes */}
        {NODES.map((node) => {
          const isSelected = selectedNode === node.id;
          return (
            <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => onNodeClick(node.id)}>
              {isSelected && (
                <rect
                  x={node.cx - NW / 2 - 5}
                  y={node.cy - NH / 2 - 5}
                  width={NW + 10}
                  height={NH + 10}
                  rx={RR + 4}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={2}
                  opacity={0.35}
                />
              )}
              <rect
                x={node.cx - NW / 2}
                y={node.cy - NH / 2}
                width={NW}
                height={NH}
                rx={RR}
                fill={node.bg}
                stroke={isSelected ? node.color : '#D1D5DB'}
                strokeWidth={isSelected ? 2 : 1.5}
              />
              <text
                x={node.cx}
                y={node.cy - 5}
                textAnchor="middle"
                fontSize={12}
                fontWeight="600"
                fill={node.color}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {node.label}
              </text>
              <text
                x={node.cx}
                y={node.cy + 11}
                textAnchor="middle"
                fontSize={10}
                fill="#9CA3AF"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {node.sublabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div style={{ width: 20, height: 3, background: color, borderRadius: 2 }} />
            <span style={{ fontSize: 10.5, color: '#6B7280', fontFamily: 'system-ui' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
