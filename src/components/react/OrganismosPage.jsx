import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  GraduationCap, ChevronRight, Search, SlidersHorizontal,
  ExternalLink, Users, Calendar, Building2, ArrowRight, X,
} from "lucide-react";
import {
  ministerios, organismos,
  getOrganismo, getMinisterio,
  hasConvocatoriaActiva, ministerioTieneConvocatoria, totalPlazasOrganismo,
} from "./organismos-data.js";

// ─── Inline useIsMobile hook ─────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

const CTA_URL = "https://app.opositasmart.com/#/welcome";

// ─── Style helpers (inline styles instead of Tailwind) ───────────
const colors = {
  bg: "#FAFAF7",
  surface: "#F5F3EE",
  border: "#E8E5DF",
  dark: "#1A1A1A",
  muted: "#757575",
  green: "#4A7C59",
  greenHover: "#3a6347",
  brown: "#8B6E4F",
  white: "#FFFFFF",
  amber: "#D97706",
  gray: "#9CA3AF",
};

const estadoColorMap = {
  abierta: { background: colors.green, color: colors.white },
  en_proceso: { background: colors.amber, color: colors.white },
  resuelta: { background: colors.gray, color: colors.white },
};

const grupoColorMap = {
  A1: { background: "#EDE9FE", color: "#5B21B6" },
  A2: { background: "#DBEAFE", color: "#1E40AF" },
  C1: { background: "#FEF3C7", color: "#92400E" },
  C2: { background: "#D1FAE5", color: "#065F46" },
};

const selectStyle = {
  height: 36,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: colors.white,
  padding: "0 12px",
  fontSize: 13,
  color: colors.dark,
  outline: "none",
  cursor: "pointer",
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
};

const mobileSelectStyle = {
  ...selectStyle,
  width: "100%",
  height: 40,
  fontSize: 14,
};

// ─── Navbar ──────────────────────────────────────────────────────
function OrganismosNavbar() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: 48, display: "flex", alignItems: "center", padding: "0 20px",
      background: colors.dark,
    }}>
      <a href="/" style={{
        display: "flex", alignItems: "center", gap: 8,
        color: colors.white, fontSize: 14, fontWeight: 600, textDecoration: "none", marginRight: 24,
      }}>
        <GraduationCap size={20} />
        OpositaSmart
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
        <a href="/radar" style={{ color: "inherit", textDecoration: "none" }}>Radar</a>
        <ChevronRight size={14} />
        <span style={{ color: "rgba(255,255,255,0.9)" }}>Organismos</span>
      </div>
    </nav>
  );
}

// ─── Filters (desktop) ──────────────────────────────────────────
function OrganismosFilters({ grupo, estado, ministerio, busqueda, onGrupoChange, onEstadoChange, onMinisterioChange, onBusquedaChange }) {
  return (
    <div style={{
      position: "fixed", top: 48, left: 0, right: 0, zIndex: 40,
      background: colors.surface, borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 20px", maxWidth: 1920, margin: "0 auto",
      }}>
        <select value={grupo} onChange={(e) => onGrupoChange(e.target.value)} style={selectStyle}>
          <option value="todos">Grupo: Todos</option>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="C1">C1</option>
          <option value="C2">C2</option>
        </select>

        <select value={estado} onChange={(e) => onEstadoChange(e.target.value)} style={selectStyle}>
          <option value="todas">Estado: Todas</option>
          <option value="abierta">Convocatoria activa</option>
          <option value="en_proceso">En proceso</option>
          <option value="resuelta">Resuelta</option>
        </select>

        <select value={ministerio} onChange={(e) => onMinisterioChange(e.target.value)} style={selectStyle}>
          <option value="todos">Ministerio: Todos</option>
          {ministerios.map((m) => (
            <option key={m.id} value={m.id}>{m.nombreCorto}</option>
          ))}
        </select>

        <div style={{ position: "relative", flex: 1, maxWidth: 280, marginLeft: "auto" }}>
          <Search size={16} style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.muted,
          }} />
          <input
            type="text"
            placeholder="Buscar organismo o cuerpo..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            style={{
              width: "100%", height: 36, paddingLeft: 36, paddingRight: 12,
              borderRadius: 8, border: `1px solid ${colors.border}`,
              background: colors.white, fontSize: 13, color: colors.dark,
              outline: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Mobile filter button ────────────────────────────────────────
function MobileFilterButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position: "fixed", top: 56, right: 16, zIndex: 40,
      display: "flex", alignItems: "center", gap: 6,
      background: colors.white, border: `1px solid ${colors.border}`,
      borderRadius: 8, padding: "8px 12px", fontSize: 13,
      fontWeight: 500, color: colors.dark, cursor: "pointer",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      <SlidersHorizontal size={16} />
      Filtros
    </button>
  );
}

// ─── Simple Drawer (CSS-based, replaces radix) ───────────────────
function Drawer({ open, onClose, children, position = "bottom", maxHeight = "85vh" }) {
  if (!open) return null;

  const isBottom = position === "bottom";
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.4)",
        }}
      />
      {/* Content */}
      <div style={{
        position: "absolute",
        ...(isBottom
          ? { bottom: 0, left: 0, right: 0, maxHeight, borderRadius: "16px 16px 0 0" }
          : { top: 0, bottom: 0, right: 0, width: 380, maxWidth: "90vw" }
        ),
        background: colors.white,
        overflowY: "auto",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        animation: "drawerSlideIn 0.25s ease-out",
      }}>
        {/* Drag handle for bottom drawers */}
        {isBottom && (
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: colors.border }} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Graph filter logic ──────────────────────────────────────────
function doesOrgMatchFilters(org, grupo, estado, ministerio, busqueda) {
  if (ministerio !== "todos" && org.ministerioId !== ministerio) return false;
  if (busqueda) {
    const q = busqueda.toLowerCase();
    const nameMatch = org.nombre.toLowerCase().includes(q) || (org.siglas?.toLowerCase().includes(q) ?? false);
    const convMatch = org.convocatorias.some((c) => c.nombre.toLowerCase().includes(q));
    if (!nameMatch && !convMatch) return false;
  }
  if (grupo !== "todos" || estado !== "todas") {
    const convMatches = org.convocatorias.filter((c) => {
      if (grupo !== "todos" && c.grupo !== grupo) return false;
      if (estado !== "todas" && c.estado !== estado) return false;
      return true;
    });
    if (convMatches.length === 0 && (grupo !== "todos" || estado !== "todas")) return false;
  }
  return true;
}

// ─── GraphCanvas ─────────────────────────────────────────────────
function GraphCanvas({ selectedId, onSelectNode, width, height, filtroGrupo, filtroEstado, filtroMinisterio, filtroBusqueda }) {
  const fgRef = useRef();

  const { nodes, links } = useMemo(() => {
    const nodesArr = [];
    const linksArr = [];

    nodesArr.push({
      id: "age", label: "AGE", type: "central",
      color: colors.dark, radius: 28, matchesFilter: true,
    });

    const anyFilterActive = filtroGrupo !== "todos" || filtroEstado !== "todas" || filtroMinisterio !== "todos" || filtroBusqueda !== "";

    ministerios.forEach((min) => {
      const orgList = min.organismos.map((oid) => organismos.find((o) => o.id === oid)).filter(Boolean);
      const anyOrgMatches = !anyFilterActive || orgList.some((o) => doesOrgMatchFilters(o, filtroGrupo, filtroEstado, filtroMinisterio, filtroBusqueda));

      nodesArr.push({
        id: min.id, label: min.nombreCorto, type: "ministerio",
        color: ministerioTieneConvocatoria(min) ? colors.green : colors.brown,
        radius: 20, matchesFilter: anyOrgMatches,
      });
      linksArr.push({ source: "age", target: min.id });

      orgList.forEach((org) => {
        const matches = !anyFilterActive || doesOrgMatchFilters(org, filtroGrupo, filtroEstado, filtroMinisterio, filtroBusqueda);
        const plazas = totalPlazasOrganismo(org);
        const baseR = 10;
        const r = plazas > 0 ? Math.min(baseR + Math.sqrt(plazas) * 0.4, 22) : baseR;

        nodesArr.push({
          id: org.id,
          label: org.siglas || org.nombre.split(" ").slice(0, 2).join(" "),
          type: "organismo", color: hasConvocatoriaActiva(org) ? colors.green : colors.border,
          radius: r, orgData: org, matchesFilter: matches,
        });
        linksArr.push({ source: min.id, target: org.id });
      });
    });

    return { nodes: nodesArr, links: linksArr };
  }, [filtroGrupo, filtroEstado, filtroMinisterio, filtroBusqueda]);

  useEffect(() => {
    const fg = fgRef.current;
    if (fg) {
      fg.d3Force("charge")?.strength(-200);
      fg.d3Force("link")?.distance((link) => {
        const src = typeof link.source === "object" ? link.source : nodes.find((n) => n.id === link.source);
        return src?.type === "central" ? 120 : 70;
      });
      setTimeout(() => fg.zoomToFit(400, 60), 500);
    }
  }, [nodes]);

  useEffect(() => {
    if (selectedId && fgRef.current) {
      const node = nodes.find((n) => n.id === selectedId);
      if (node && node.x != null) {
        fgRef.current.centerAt(node.x, node.y, 400);
        fgRef.current.zoom(2, 400);
      }
    } else if (!selectedId && fgRef.current) {
      fgRef.current.zoomToFit(400, 60);
    }
  }, [selectedId, nodes]);

  const handleNodeClick = useCallback((node) => {
    if (node.type === "organismo") {
      onSelectNode(node.id === selectedId ? null : node.id);
    } else if (node.type === "ministerio" && fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 400);
      fgRef.current.zoom(1.8, 400);
    }
  }, [selectedId, onSelectNode]);

  const handleBgClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  const nodeCanvasObject = useCallback((node, ctx) => {
    const r = node.radius;
    const alpha = node.matchesFilter ? 1 : 0.15;
    const isSelected = node.id === selectedId;

    ctx.globalAlpha = alpha;

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(139,110,79,0.25)";
      ctx.fill();
      ctx.strokeStyle = colors.brown;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();

    const fontSize = node.type === "central" ? 11 : node.type === "ministerio" ? 9 : 7;
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = node.color === colors.border ? colors.muted : colors.white;
    ctx.fillText(node.label, node.x, node.y);

    ctx.globalAlpha = 1;
  }, [selectedId]);

  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 4, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: colors.bg }}>
      <ForceGraph2D
        ref={fgRef}
        width={width}
        height={height}
        graphData={{ nodes, links }}
        nodeId="id"
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBgClick}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkColor={() => "#D4D0C8"}
        linkWidth={1}
        cooldownTicks={80}
        enableNodeDrag={false}
        minZoom={0.5}
        maxZoom={5}
      />

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 16, right: 16,
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
        border: `1px solid ${colors.border}`, borderRadius: 8,
        padding: 12, display: "flex", flexDirection: "column", gap: 8,
      }}>
        {[
          { color: colors.green, label: "Convocatoria activa" },
          { color: colors.border, label: "Sin convocatoria" },
          { color: colors.dark, label: "Nodo central" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: colors.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SidePanel sub-components ────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", textAlign: "center", padding: "0 32px",
    }}>
      <Building2 size={48} color="#D4D0C8" style={{ marginBottom: 16 }} />
      <p style={{ fontSize: 15, color: colors.muted, lineHeight: 1.6 }}>
        Selecciona un organismo en el grafo para ver sus datos
      </p>
    </div>
  );
}

function CtaFooter() {
  return (
    <div style={{ padding: 16, background: colors.green, flexShrink: 0 }}>
      <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>
        ¿Preparando oposiciones? Aprende más rápido con repetición espaciada.
      </p>
      <a href={CTA_URL} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: colors.white, color: colors.green, fontWeight: 600,
        fontSize: 13, padding: "8px 16px", borderRadius: 8,
        textDecoration: "none",
      }}>
        Prueba OpositaSmart gratis
        <ArrowRight size={16} />
      </a>
    </div>
  );
}

function ConvocatoriasTab({ organismo }) {
  if (organismo.convocatorias.length === 0) {
    return <p style={{ fontSize: 14, color: colors.muted, textAlign: "center", padding: "32px 0" }}>Sin convocatorias activas</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {organismo.convocatorias.map((c, i) => (
        <div key={i} style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: colors.dark, lineHeight: 1.3, flex: 1, marginRight: 8 }}>{c.nombre}</h4>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
              ...(grupoColorMap[c.grupo] || {}),
            }}>{c.grupo}</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: colors.dark, margin: 0 }}>
            {c.plazas.toLocaleString("es-ES")} <span style={{ fontSize: 13, fontWeight: 400, color: colors.muted }}>plazas</span>
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
              ...(estadoColorMap[c.estado] || {}),
            }}>
              {c.estado === "abierta" ? "Abierta" : c.estado === "en_proceso" ? "En proceso" : "Resuelta"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: colors.muted }}>
              <Calendar size={14} />
              BOE {c.fechaBoe}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DatosTab({ organismo }) {
  if (organismo.plazasHistoricas.length === 0) {
    return <p style={{ fontSize: 14, color: colors.muted, textAlign: "center", padding: "32px 0" }}>Sin datos históricos disponibles</p>;
  }
  const data = organismo.plazasHistoricas.map((d) => ({ name: String(d.año), plazas: d.plazas }));
  const totalHistorico = organismo.plazasHistoricas.reduce((s, d) => s + d.plazas, 0);

  return (
    <div>
      <h4 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: colors.muted, marginBottom: 12 }}>
        Plazas convocadas
      </h4>
      <div style={{ height: 180, marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={28}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: colors.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: colors.muted }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 13, borderRadius: 8, border: `1px solid ${colors.border}` }}
              cursor={{ fill: "rgba(74,124,89,0.08)" }}
            />
            <Bar dataKey="plazas" fill={colors.green} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
        <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>
          Total plazas históricas: <span style={{ fontWeight: 600, color: colors.dark }}>{totalHistorico.toLocaleString("es-ES")}</span>
        </p>
      </div>
    </div>
  );
}

function NoticiasTab({ organismo }) {
  if (organismo.noticias.length === 0) {
    return <p style={{ fontSize: 14, color: colors.muted, textAlign: "center", padding: "32px 0" }}>Sin noticias recientes</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {organismo.noticias.map((n, i) => (
        <div key={i} style={{
          borderBottom: i < organismo.noticias.length - 1 ? `1px solid ${colors.border}` : "none",
          paddingBottom: 12,
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: colors.dark, lineHeight: 1.4, marginBottom: 4 }}>{n.titular}</h4>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: colors.muted }}>{n.fuente} · {n.fecha}</span>
            <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: colors.green }}>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SidePanel ───────────────────────────────────────────────────
function SidePanel({ organismo, style = {} }) {
  const [tab, setTab] = useState("convocatorias");

  if (!organismo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: colors.white, ...style }}>
        <EmptyState />
        <CtaFooter />
      </div>
    );
  }

  const ministerio = getMinisterio(organismo.ministerioId);
  const tabs = ["convocatorias", "datos", "noticias"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: colors.white, ...style }}>
      {/* Header */}
      <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}` }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.dark, lineHeight: 1.3, fontFamily: "Georgia, serif", margin: 0 }}>
          {organismo.nombre}
          {organismo.siglas && <span style={{ color: colors.muted, fontWeight: 400, fontSize: 16 }}> ({organismo.siglas})</span>}
        </h2>
        {ministerio && (
          <p style={{ fontSize: 13, color: colors.brown, fontWeight: 500, marginTop: 4 }}>{ministerio.nombre}</p>
        )}
        <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.6, marginTop: 8 }}>{organismo.descripcion}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#D1FAE5", color: "#065F46",
            fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
          }}>
            <Users size={14} />
            {organismo.empleados.toLocaleString("es-ES")} empleados
          </span>
        </div>
        {organismo.responsable && (
          <p style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>
            {organismo.responsable} · Nombrado/a {organismo.responsableDesde}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${colors.border}` }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600,
              textTransform: "capitalize", cursor: "pointer",
              background: "none", border: "none",
              color: tab === t ? colors.green : colors.muted,
              borderBottom: tab === t ? `2px solid ${colors.green}` : "2px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {tab === "convocatorias" && <ConvocatoriasTab organismo={organismo} />}
        {tab === "datos" && <DatosTab organismo={organismo} />}
        {tab === "noticias" && <NoticiasTab organismo={organismo} />}
      </div>

      <CtaFooter />
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────
export default function OrganismosPage() {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState(null);
  const [grupo, setGrupo] = useState("todos");
  const [estado, setEstado] = useState("todas");
  const [ministerio, setMinisterio] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedOrg = selectedId ? getOrganismo(selectedId) ?? null : null;

  const graphContainerRef = useRef(null);
  const [graphDims, setGraphDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setGraphDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleSelectNode = useCallback((id) => {
    setSelectedId(id);
  }, []);

  if (isMobile) {
    return (
      <>
        <OrganismosNavbar />
        <div style={{ paddingTop: 48, height: "100vh", display: "flex", flexDirection: "column" }}>
          <MobileFilterButton onClick={() => setFiltersOpen(true)} />

          {/* Filter drawer */}
          <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)}>
            <div style={{ padding: "16px 16px 4px", fontWeight: 600, fontSize: 16 }}>Filtros</div>
            <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <select value={grupo} onChange={(e) => setGrupo(e.target.value)} style={mobileSelectStyle}>
                <option value="todos">Grupo: Todos</option>
                <option value="A1">A1</option><option value="A2">A2</option>
                <option value="C1">C1</option><option value="C2">C2</option>
              </select>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} style={mobileSelectStyle}>
                <option value="todas">Estado: Todas</option>
                <option value="abierta">Convocatoria activa</option>
                <option value="en_proceso">En proceso</option>
                <option value="resuelta">Resuelta</option>
              </select>
              <select value={ministerio} onChange={(e) => setMinisterio(e.target.value)} style={mobileSelectStyle}>
                <option value="todos">Ministerio: Todos</option>
                {ministerios.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombreCorto}</option>
                ))}
              </select>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.muted,
                }} />
                <input
                  type="text"
                  placeholder="Buscar organismo o cuerpo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{
                    ...mobileSelectStyle,
                    paddingLeft: 36,
                  }}
                />
              </div>
            </div>
          </Drawer>

          {/* Graph */}
          <div ref={graphContainerRef} style={{ flex: 1, position: "relative" }}>
            <GraphCanvas
              selectedId={selectedId}
              onSelectNode={handleSelectNode}
              width={graphDims.w}
              height={graphDims.h}
              filtroGrupo={grupo}
              filtroEstado={estado}
              filtroMinisterio={ministerio}
              filtroBusqueda={busqueda}
            />
          </div>

          {/* Bottom sheet for selected org */}
          <Drawer
            open={!!selectedOrg}
            onClose={() => setSelectedId(null)}
          >
            <SidePanel organismo={selectedOrg} />
          </Drawer>
        </div>
      </>
    );
  }

  // ───── DESKTOP ─────
  return (
    <>
      <OrganismosNavbar />
      <div style={{ paddingTop: 48, height: "100vh", display: "flex", flexDirection: "column" }}>
        <OrganismosFilters
          grupo={grupo}
          estado={estado}
          ministerio={ministerio}
          busqueda={busqueda}
          onGrupoChange={setGrupo}
          onEstadoChange={setEstado}
          onMinisterioChange={setMinisterio}
          onBusquedaChange={setBusqueda}
        />

        <div style={{ display: "flex", flex: 1, paddingTop: 48 }}>
          {/* Side panel */}
          <div style={{
            width: 380, flexShrink: 0, borderRight: `1px solid ${colors.border}`,
            overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            <SidePanel organismo={selectedOrg} />
          </div>

          {/* Graph */}
          <div ref={graphContainerRef} style={{ flex: 1, position: "relative" }}>
            <GraphCanvas
              selectedId={selectedId}
              onSelectNode={handleSelectNode}
              width={graphDims.w}
              height={graphDims.h}
              filtroGrupo={grupo}
              filtroEstado={estado}
              filtroMinisterio={ministerio}
              filtroBusqueda={busqueda}
            />
          </div>
        </div>
      </div>
    </>
  );
}
