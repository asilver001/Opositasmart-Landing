import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { hierarchy, tree } from 'd3-hierarchy';
import { linkRadial } from 'd3-shape';
import {
  ExternalLink, Users, Calendar, Building2, ArrowRight, X,
  ChevronRight, GraduationCap, Search,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ministerios, organismos, getOrganismo, getMinisterio,
  hasConvocatoriaActiva, totalPlazasOrganismo,
} from './organismos-data.js';

// ─── Constants ───────────────────────────────────────────────────
const CTA_URL = 'https://app.opositasmart.com/#/welcome';

const RING_RADII = { 0: 0, 1: 150, 2: 310 };
const NODE_SIZES = { root: 34, ministerio: 22, organismo: 14 };

// CivLab-inspired: each ring has its own color
const RING_COLORS = {
  root: '#1A1A1A',
  ministerio: '#2D6A4F',    // forest green
  organismo: '#8B6E4F',     // warm brown
  active: '#40916C',        // lighter green for active convocatorias
};

const COLORS = {
  bg: '#FAFAF7',
  dark: '#1A1A1A',
  green: '#2D6A4F',
  greenLight: '#40916C',
  greenTint: '#D1FAE5',
  brown: '#8B6E4F',
  border: '#E8E5DF',
  muted: '#757575',
  surface: '#F5F3EE',
  white: '#FFFFFF',
  amber: '#D97706',
  gray: '#9CA3AF',
  ring: 'rgba(45, 106, 79, 0.08)',
  selected: '#D97706',       // amber for selection (CivLab uses coral)
};

const ESTADO_COLORS = {
  abierta: { bg: '#D1FAE5', color: '#065F46' },
  en_proceso: { bg: '#FEF3C7', color: '#92400E' },
  resuelta: { bg: '#F3F4F6', color: '#6B7280' },
};

const GRUPO_COLORS = {
  A1: { bg: '#EDE9FE', color: '#5B21B6' },
  A2: { bg: '#DBEAFE', color: '#1E40AF' },
  C1: { bg: '#FEF3C7', color: '#92400E' },
  C2: { bg: '#D1FAE5', color: '#065F46' },
};

// ─── Build hierarchy data ────────────────────────────────────────
function buildTreeData() {
  return {
    id: 'age',
    name: 'AGE',
    type: 'root',
    children: ministerios.map(min => {
      const orgList = min.organismos
        .map(oid => organismos.find(o => o.id === oid))
        .filter(Boolean);
      return {
        id: min.id,
        name: min.nombreCorto,
        type: 'ministerio',
        children: orgList.map(org => ({
          id: org.id,
          name: org.siglas || org.nombre.split(' ').slice(0, 2).join(' '),
          fullName: org.nombre,
          type: 'organismo',
          hasConvocatoria: hasConvocatoriaActiva(org),
          plazas: totalPlazasOrganismo(org),
          orgData: org,
        })),
      };
    }),
  };
}

// ─── Polar helpers ───────────────────────────────────────────────
function polar(angle, radius) {
  return [
    radius * Math.cos(angle - Math.PI / 2),
    radius * Math.sin(angle - Math.PI / 2),
  ];
}

// ─── useIsMobile ─────────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setM(mq.matches);
    const h = e => setM(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return m;
}

// ─── Animated node (CSS animation, no framer-motion needed) ─────
function AnimatedNode({ x, y, delay, children }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <g
      style={{
        transform: show ? `translate(${x}px, ${y}px)` : 'translate(0px, 0px)',
        opacity: show ? 1 : 0,
        transition: `transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </g>
  );
}

// ─── Animated link ───────────────────────────────────────────────
function AnimatedLink({ d, delay, connected, selected }) {
  const ref = useRef(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (ref.current) setLength(ref.current.getTotalLength());
  }, [d]);

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke={connected ? 'rgba(45,106,79,0.25)' : 'rgba(228,225,219,0.4)'}
      strokeWidth={connected ? 1.5 : 0.8}
      strokeDasharray={length}
      strokeDashoffset={0}
      style={{
        animation: `drawLink 1s ease ${delay}ms both`,
        opacity: selected ? (connected ? 0.8 : 0.1) : 0.4,
      }}
    />
  );
}

// ─── Side Panel ──────────────────────────────────────────────────
function SidePanel({ organismo, onClose, isMobile }) {
  const [tab, setTab] = useState('convocatorias');

  if (!organismo) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%', background: COLORS.white,
        alignItems: 'center', justifyContent: 'center', padding: 32,
      }}>
        <Building2 size={48} color={COLORS.border} style={{ marginBottom: 16 }} />
        <p style={{ fontSize: 15, color: COLORS.muted, textAlign: 'center' }}>
          Selecciona un organismo en el grafo para ver sus datos
        </p>
      </div>
    );
  }

  const min = getMinisterio(organismo.ministerioId);
  const tabs = ['convocatorias', 'datos', 'noticias'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: COLORS.white }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
        {isMobile && onClose && (
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
            cursor: 'pointer', padding: 4, color: COLORS.muted,
          }}>
            <X size={20} />
          </button>
        )}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, lineHeight: 1.3 }}>
          {organismo.nombre}
          {organismo.siglas && <span style={{ color: COLORS.muted, fontWeight: 400, fontSize: 16 }}> ({organismo.siglas})</span>}
        </h2>
        {min && <p style={{ fontSize: 13, color: COLORS.brown, fontWeight: 500, marginTop: 4 }}>{min.nombre}</p>}
        <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6, marginTop: 8 }}>{organismo.descripcion}</p>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: COLORS.greenTint, color: '#065F46', fontSize: 12,
          fontWeight: 600, padding: '4px 10px', borderRadius: 6, marginTop: 8,
        }}>
          <Users size={14} />
          {organismo.empleados.toLocaleString('es-ES')} empleados
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}` }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 0', fontSize: 13, fontWeight: tab === t ? 600 : 500,
            color: tab === t ? COLORS.green : COLORS.muted, background: 'none', border: 'none',
            borderBottom: tab === t ? `2px solid ${COLORS.green}` : '2px solid transparent',
            cursor: 'pointer', textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {tab === 'convocatorias' && (
          organismo.convocatorias.length === 0
            ? <p style={{ fontSize: 14, color: COLORS.muted, textAlign: 'center', padding: 32 }}>Sin convocatorias activas</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {organismo.convocatorias.map((c, i) => {
                  const ec = ESTADO_COLORS[c.estado] || ESTADO_COLORS.resuelta;
                  const gc = GRUPO_COLORS[c.grupo] || GRUPO_COLORS.C2;
                  return (
                    <div key={i} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.dark }}>{c.nombre}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: gc.bg, color: gc.color }}>{c.grupo}</span>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 700, color: COLORS.dark }}>{c.plazas.toLocaleString('es-ES')} <span style={{ fontSize: 13, fontWeight: 400, color: COLORS.muted }}>plazas</span></p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: ec.bg, color: ec.color }}>
                          {c.estado === 'abierta' ? 'Abierta' : c.estado === 'en_proceso' ? 'En proceso' : 'Resuelta'}
                        </span>
                        <span style={{ fontSize: 12, color: COLORS.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={14} /> BOE {c.fechaBoe}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
        )}
        {tab === 'datos' && (
          organismo.plazasHistoricas.length === 0
            ? <p style={{ fontSize: 14, color: COLORS.muted, textAlign: 'center', padding: 32 }}>Sin datos históricos</p>
            : <div>
                <h4 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.muted, marginBottom: 12 }}>Plazas convocadas</h4>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={organismo.plazasHistoricas.map(d => ({ name: String(d.año), plazas: d.plazas }))} barSize={28}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, border: `1px solid ${COLORS.border}` }} />
                      <Bar dataKey="plazas" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
        )}
        {tab === 'noticias' && (
          organismo.noticias.length === 0
            ? <p style={{ fontSize: 14, color: COLORS.muted, textAlign: 'center', padding: 32 }}>Sin noticias recientes</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {organismo.noticias.map((n, i) => (
                  <div key={i} style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: COLORS.dark, lineHeight: 1.4, marginBottom: 4 }}>{n.titular}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: COLORS.muted }}>{n.fuente} · {n.fecha}</span>
                      <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.green }}>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
        )}
      </div>

      {/* CTA footer */}
      <div style={{ padding: 16, background: COLORS.green, flexShrink: 0 }}>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, marginBottom: 8 }}>
          ¿Preparando oposiciones? Aprende más rápido con repetición espaciada.
        </p>
        <a href={CTA_URL} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: COLORS.white, color: COLORS.green, fontWeight: 600,
          fontSize: 13, padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
        }}>
          Prueba OpositaSmart gratis <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}

// ─── CivLab-style: uniform distribution on rings ─────────────────
function buildRadialNodes() {
  const nodes = [];
  const links = [];

  // Root node (AGE)
  nodes.push({ id: 'age', name: 'AGE', type: 'root', angle: 0, radius: 0 });

  // Ministerios — equally spaced on ring 1
  const minCount = ministerios.length;
  ministerios.forEach((min, i) => {
    const angle = (i / minCount) * 2 * Math.PI;
    nodes.push({ id: min.id, name: min.nombreCorto, type: 'ministerio', angle, radius: RING_RADII[1] });
    links.push({ source: 'age', target: min.id });

    // Organismos for this ministerio
    const orgList = min.organismos.map(oid => organismos.find(o => o.id === oid)).filter(Boolean);
    orgList.forEach((org, j) => {
      // Spread organismos around their parent ministerio's angle
      const spread = (Math.PI * 0.6) / minCount; // angular spread per ministerio
      const orgAngle = angle + (j - (orgList.length - 1) / 2) * (spread / Math.max(orgList.length - 1, 1));
      nodes.push({
        id: org.id, name: org.siglas || org.nombre.split(' ').slice(0, 2).join(' '),
        fullName: org.nombre, type: 'organismo', angle: orgAngle, radius: RING_RADII[2],
        hasConvocatoria: hasConvocatoriaActiva(org), plazas: totalPlazasOrganismo(org),
        orgData: org, parentMinId: min.id,
      });
      links.push({ source: min.id, target: org.id });
    });
  });

  return { nodes, links };
}

// ─── Diamond shape for ministerios (CivLab uses rotated rects) ───
function Diamond({ size, fill, stroke, strokeWidth, opacity, selected }) {
  const s = size;
  return (
    <rect
      x={-s} y={-s} width={s * 2} height={s * 2} rx={4} ry={4}
      fill={fill} stroke={stroke} strokeWidth={strokeWidth}
      transform="rotate(45)"
      style={{
        opacity,
        transition: 'opacity 0.4s, fill 0.4s',
        filter: selected ? `drop-shadow(0 0 10px ${COLORS.selected})` : 'none',
      }}
    />
  );
}

// ─── Radial Graph SVG ────────────────────────────────────────────
function RadialGraphSVG({ width, height, selectedId, onSelectNode }) {
  const { nodes, links } = useMemo(() => buildRadialNodes(), []);

  // Compute rotation so selected node is at top
  const rotationOffset = useMemo(() => {
    if (!selectedId) return 0;
    const sel = nodes.find(n => n.id === selectedId);
    return sel ? -sel.angle : 0;
  }, [selectedId, nodes]);

  // Scale to fit
  const graphRadius = RING_RADII[2] + 60;
  const fitScale = Math.min(width, height) / (graphRadius * 2);
  const scale = Math.min(fitScale, 1);
  const cx = width / 2;
  const cy = height / 2;

  const isConnected = useCallback((node) => {
    if (!selectedId) return true;
    if (node.id === selectedId) return true;
    // Check parent link
    const sel = nodes.find(n => n.id === selectedId);
    if (!sel) return true;
    if (sel.parentMinId === node.id) return true; // selected org's ministerio
    if (node.parentMinId === sel.parentMinId && node.type === 'organismo') return true; // sibling org
    if (node.type === 'root') return true;
    return false;
  }, [selectedId, nodes]);

  const rotDeg = (rotationOffset * 180) / Math.PI;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: COLORS.bg }}>
      <g transform={`translate(${cx},${cy}) scale(${scale})`}>
        {/* Rotation group */}
        <g style={{
          transform: `rotate(${rotDeg}deg)`,
          transition: 'transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transformOrigin: '0 0',
        }}>

          {/* Ring guides — CivLab-style dashed circles */}
          <circle r={RING_RADII[1]} fill="none" stroke={RING_COLORS.ministerio} strokeWidth={1} strokeDasharray="4 2" opacity={0.3} />
          <circle r={RING_RADII[2]} fill="none" stroke={RING_COLORS.organismo} strokeWidth={1} strokeDasharray="4 2" opacity={0.2} />

          {/* Ring labels — counter-rotate */}
          <g style={{ transform: `rotate(${-rotDeg}deg)`, transition: 'transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)', transformOrigin: '0 0' }}>
            <text x={0} y={RING_RADII[1] + 22} textAnchor="middle" fontSize={10} fill={RING_COLORS.ministerio} fontWeight={600} letterSpacing="0.06em" style={{ userSelect: 'none' }}>
              MINISTERIOS
            </text>
            <text x={0} y={RING_RADII[2] + 22} textAnchor="middle" fontSize={10} fill={RING_COLORS.organismo} fontWeight={600} letterSpacing="0.06em" style={{ userSelect: 'none' }}>
              ORGANISMOS
            </text>
          </g>

          {/* Links — curved lines from parent to child */}
          {links.map((link, i) => {
            const src = nodes.find(n => n.id === link.source);
            const tgt = nodes.find(n => n.id === link.target);
            if (!src || !tgt) return null;
            const [sx, sy] = polar(src.angle, src.radius);
            const [tx, ty] = polar(tgt.angle, tgt.radius);
            const conn = isConnected(src) && isConnected(tgt);
            // Curved path via midpoint
            const mr = (src.radius + tgt.radius) / 2;
            const ma = (src.angle + tgt.angle) / 2;
            const [mx, my] = polar(ma, mr * 0.85);
            return (
              <path
                key={i}
                d={`M${sx},${sy} Q${mx},${my} ${tx},${ty}`}
                fill="none"
                stroke={conn ? RING_COLORS.ministerio : COLORS.border}
                strokeWidth={conn ? 1.5 : 0.5}
                opacity={selectedId ? (conn ? 0.5 : 0.06) : 0.2}
                style={{ transition: 'opacity 0.4s, stroke 0.4s' }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const [x, y] = polar(node.angle, node.radius);
            const size = NODE_SIZES[node.type];
            const connected = isConnected(node);
            const isSelected = node.id === selectedId;
            const hitRadius = Math.max(size + 14, 22);
            const delay = (node.type === 'root' ? 0 : node.type === 'ministerio' ? 1 : 2) * 200 + i * 20;

            // CivLab-style: white fill, colored stroke
            let fill = COLORS.white;
            let stroke = COLORS.border;
            let labelColor = COLORS.muted;

            if (node.type === 'root') {
              fill = COLORS.dark; stroke = COLORS.dark; labelColor = COLORS.white;
            } else if (node.type === 'ministerio') {
              stroke = RING_COLORS.ministerio;
              labelColor = RING_COLORS.ministerio;
            } else if (node.hasConvocatoria) {
              stroke = RING_COLORS.active;
              labelColor = RING_COLORS.active;
            } else {
              stroke = RING_COLORS.organismo;
              labelColor = RING_COLORS.organismo;
            }

            if (isSelected) {
              fill = COLORS.selected;
              stroke = COLORS.selected;
              labelColor = COLORS.white;
            }

            return (
              <AnimatedNode key={node.id} x={x} y={y} delay={delay}>
                {/* Selection glow */}
                {isSelected && <circle r={size + 8} fill={COLORS.selected} opacity={0.15} />}

                {/* Hit area */}
                <circle
                  r={hitRadius}
                  fill="transparent"
                  style={{ cursor: node.type !== 'root' ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (node.type === 'organismo') onSelectNode(isSelected ? null : node.id);
                    else if (node.type === 'ministerio') onSelectNode(null);
                  }}
                />

                {/* Node shape — different per level (CivLab pattern) */}
                {node.type === 'ministerio' ? (
                  <Diamond
                    size={size * 0.7}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                    opacity={connected ? 1 : 0.15}
                    selected={isSelected}
                  />
                ) : (
                  <circle
                    r={size}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                    style={{
                      opacity: connected ? 1 : 0.15,
                      transition: 'opacity 0.4s, fill 0.4s',
                      filter: isSelected ? `drop-shadow(0 0 10px ${COLORS.selected})` : 'none',
                    }}
                  />
                )}

                {/* Label — counter-rotate to stay horizontal */}
                <g style={{
                  transform: `rotate(${-rotDeg}deg)`,
                  transition: 'transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  transformOrigin: '0 0',
                }}>
                  {node.type === 'root' ? (
                    <text
                      dy="0.35em"
                      textAnchor="middle"
                      fontSize={14}
                      fontWeight={800}
                      fill={labelColor}
                      style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      {node.name}
                    </text>
                  ) : (
                    <text
                      dy={node.type === 'ministerio' ? size + 16 : size + 12}
                      textAnchor="middle"
                      fontSize={node.type === 'ministerio' ? 9 : 7}
                      fontWeight={600}
                      fill={connected ? labelColor : COLORS.gray}
                      style={{
                        pointerEvents: 'none', userSelect: 'none',
                        opacity: connected ? 0.85 : 0.15,
                        transition: 'opacity 0.4s',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      {node.name}
                    </text>
                  )}
                </g>
              </AnimatedNode>
            );
          })}

        </g>{/* end rotation */}
      </g>{/* end translate/scale */}
    </svg>
  );
}

// ─── Main Page Component ─────────────────────────────────────────
export default function RadialGraphPage() {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const containerRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedOrg = selectedId ? getOrganismo(selectedId) : null;

  // Open drawer on mobile when org selected
  useEffect(() => {
    if (selectedOrg && isMobile) setDrawerOpen(true);
  }, [selectedOrg, isMobile]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.bg }}>
      {/* Navbar */}
      <nav style={{
        height: 48, display: 'flex', alignItems: 'center', padding: '0 20px',
        background: COLORS.dark, flexShrink: 0, zIndex: 50,
      }}>
        <a href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: COLORS.white, fontSize: 14, fontWeight: 600, textDecoration: 'none', marginRight: 24,
        }}>
          <GraduationCap size={20} />
          OpositaSmart
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          <a href="/radar" style={{ color: 'inherit', textDecoration: 'none' }}>Radar</a>
          <ChevronRight size={14} />
          <span style={{ color: 'rgba(255,255,255,0.9)' }}>Organismos</span>
        </div>
      </nav>

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Side panel (desktop) */}
        {!isMobile && (
          <div style={{
            width: 380, flexShrink: 0, borderRight: `1px solid ${COLORS.border}`,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <SidePanel organismo={selectedOrg} isMobile={false} />
          </div>
        )}

        {/* Graph */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <RadialGraphSVG
            width={dims.w}
            height={dims.h}
            selectedId={selectedId}
            onSelectNode={setSelectedId}
          />

          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
            border: `1px solid ${COLORS.border}`, borderRadius: 10,
            padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: COLORS.dark, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: COLORS.muted }}>AGE (central)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, border: `2px solid ${RING_COLORS.ministerio}`, background: COLORS.white, transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: COLORS.muted }}>Ministerio</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${RING_COLORS.active}`, background: COLORS.white, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: COLORS.muted }}>Conv. activa</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${RING_COLORS.organismo}`, background: COLORS.white, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: COLORS.muted }}>Sin convocatoria</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.selected, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: COLORS.muted }}>Seleccionado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobile && drawerOpen && selectedOrg && (
        <>
          <div
            onClick={() => { setDrawerOpen(false); setSelectedId(null); }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
              zIndex: 60, transition: 'opacity 0.3s',
            }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            maxHeight: '85vh', background: COLORS.white, borderRadius: '16px 16px 0 0',
            zIndex: 70, overflow: 'auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          }}>
            <SidePanel
              organismo={selectedOrg}
              onClose={() => { setDrawerOpen(false); setSelectedId(null); }}
              isMobile={true}
            />
          </div>
        </>
      )}
    </div>
  );
}
