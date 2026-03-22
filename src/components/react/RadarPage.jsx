import { useState, useMemo, useEffect } from "react";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Users, ExternalLink, Share2, ArrowRight, GraduationCap } from "lucide-react";
import { supabase } from "../../lib/supabase";

// ===== CONFIG =====

const estadoProgress = {
  pendiente: 0,
  convocada: 20,
  plazo_inscripcion: 40,
  lista_admitidos: 60,
  fecha_examen_confirmada: 80,
  examen_realizado: 90,
  lista_aprobados: 100,
};

const estadoLabels = {
  pendiente: "Pendiente",
  convocada: "Convocada",
  plazo_inscripcion: "Inscripción abierta",
  lista_admitidos: "Lista admitidos",
  fecha_examen_confirmada: "Fecha confirmada",
  examen_realizado: "Examen realizado",
  lista_aprobados: "Lista aprobados",
};

function getEstadoBadgeStyle(estado) {
  switch (estado) {
    case "convocada":
    case "fecha_examen_confirmada":
      return { background: "#D1FAE5", color: "#065F46" };
    case "plazo_inscripcion":
      return { background: "#FEF3C7", color: "#92400E" };
    default:
      return { background: "#F3F4F6", color: "#6B7280" };
  }
}

function getNivelBadgeStyle(nivel) {
  return nivel === "C1"
    ? { background: "#EDE9FE", color: "#5B21B6" }
    : { background: "#FEF3C7", color: "#92400E" };
}

function getProgressBarColor(estado) {
  switch (estado) {
    case "convocada":
    case "fecha_examen_confirmada":
      return "#2D6A4F";
    case "plazo_inscripcion":
      return "#F59E0B";
    default:
      return "#B5B3AF";
  }
}

function shareCard(op) {
  const examPart = op.fecha_examen
    ? `, examen ${op.fecha_examen_estimada ? "estimado" : "confirmado"} ${format(new Date(op.fecha_examen), "d MMM yyyy", { locale: es })}`
    : "";
  const text = `📊 ${op.nombre} — ${op.plazas} plazas${examPart}\n\nVer estado completo en: opositasmart.com/radar`;
  if (navigator.share) {
    navigator.share({
      title: `${op.nombre} — Radar de Oposiciones`,
      text: text,
      url: "https://www.opositasmart.com/radar"
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('Texto copiado al portapapeles');
    }).catch(() => {});
  }
}

// ===== HOOKS =====

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    mql.addEventListener("change", check);
    return () => mql.removeEventListener("change", check);
  }, [breakpoint]);
  return isMobile;
}

// ===== COMPONENTS =====

function FilterGroup({ options, selected, onChange }) {
  return (
    <div style={{ display: "inline-flex", background: "white", border: "1px solid rgba(0,0,0,0.05)", borderRadius: "12px", padding: "4px", gap: "2px" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "6px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
            background: selected === opt.value ? "#2D6A4F" : "transparent",
            color: selected === opt.value ? "white" : "#4B5563",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function OposicionCard({ op, isMobile }) {
  const progress = estadoProgress[op.estado] || 0;
  const daysLeft = op.fecha_examen ? differenceInDays(new Date(op.fecha_examen), new Date()) : null;

  return (
    <article style={{
      background: "white",
      border: "1px solid rgba(0,0,0,0.05)",
      borderRadius: "16px",
      padding: "24px",
      transition: "all 0.2s",
      display: "flex",
      flexDirection: "column",
      cursor: "default",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{
          ...getEstadoBadgeStyle(op.estado),
          fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.06em", padding: "4px 10px", borderRadius: "8px",
        }}>
          {estadoLabels[op.estado] || op.estado}
        </span>
        <span style={{
          ...getNivelBadgeStyle(op.nivel),
          fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px",
        }}>
          {op.nivel || "—"}
        </span>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: isMobile ? "16px" : "17px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.3, marginBottom: "2px", color: "#111827" }}>
        {op.nombre}
      </h3>
      <p style={{ fontSize: "13px", color: "#B5B3AF", marginBottom: "16px" }}>{op.ambito}</p>

      {/* Hero metric */}
      <div style={{ background: "rgba(45,106,79,0.06)", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px" }}>
        {daysLeft !== null && daysLeft > 0 ? (
          <>
            <span style={{ fontSize: "28px", fontWeight: 800, color: "#2D6A4F", lineHeight: 1 }}>{daysLeft}</span>
            <span style={{ fontSize: "14px", color: "#4B5563", marginLeft: "8px" }}>
              días para el examen
              {op.fecha_examen_estimada && <span style={{ fontSize: "11px", color: "#B5B3AF", marginLeft: "6px" }}>(est.)</span>}
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: "28px", fontWeight: 800, color: "#2D6A4F", lineHeight: 1 }}>{(op.plazas || 0).toLocaleString("es-ES")}</span>
            <span style={{ fontSize: "14px", color: "#4B5563", marginLeft: "8px" }}>plazas convocadas</span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{ flex: 1, height: "8px", background: "#FAFAF7", borderRadius: "99px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: getProgressBarColor(op.estado), borderRadius: "99px", transition: "width 0.6s" }} />
        </div>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#B5B3AF", width: "32px", textAlign: "right" }}>{progress}%</span>
      </div>

      {/* Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px", flex: 1 }}>
        {op.fecha_examen && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#4B5563" }}>
            <CalendarDays size={16} style={{ color: "#B5B3AF", flexShrink: 0 }} />
            <span>
              {format(new Date(op.fecha_examen), "d MMM yyyy", { locale: es })}
              {op.fecha_examen_estimada && <span style={{ color: "#B5B3AF" }}> (estimada)</span>}
            </span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#4B5563" }}>
          <Users size={16} style={{ color: "#B5B3AF", flexShrink: 0 }} />
          <span>{(op.plazas || 0).toLocaleString("es-ES")} plazas{op.tiene_bolsa && ' · Bolsa de trabajo'}</span>
        </div>
        {op.sede_examen && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#4B5563" }}>
            <span style={{ color: "#B5B3AF", flexShrink: 0, fontSize: "14px" }}>📍</span>
            <span>{op.sede_examen}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <button
          onClick={() => shareCard(op)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#B5B3AF", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        >
          <Share2 size={14} />
          Compartir
        </button>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {op.enlace_inscripcion && (
            <a
              href={op.enlace_inscripcion}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "13px", fontWeight: 600, color: "#2D6A4F", textDecoration: "none" }}
            >
              Inscribirse
            </a>
          )}
          {op.enlace_boe ? (
            <a
              href={op.enlace_boe}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#2D6A4F", textDecoration: "none" }}
            >
              BOE
              <ExternalLink size={14} />
            </a>
          ) : (
            <span style={{ fontSize: "12px", color: "#B5B3AF" }}>Pendiente</span>
          )}
        </div>
      </div>
    </article>
  );
}

// ===== MAIN =====

export default function RadarPage() {
  const isMobile = useIsMobile();
  const [scope, setScope] = useState("todas");
  const [level, setLevel] = useState("all");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: rows, error } = await supabase
        .from("oposiciones_radar")
        .select("*")
        .order("plazas", { ascending: false, nullsFirst: false });
      if (!error && rows) setData(rows);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return data.filter((op) => {
      if (scope === "estado" && op.ambito !== "Estado") return false;
      if (scope === "ccaa" && op.ambito === "Estado") return false;
      if (level === "c1" && op.nivel !== "C1") return false;
      if (level === "c2" && op.nivel !== "C2") return false;
      return true;
    });
  }, [data, scope, level]);

  const totalPlazas = filtered.reduce((s, o) => s + (o.plazas || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF7", fontFamily: "'Inter', system-ui, sans-serif", color: "#111827", WebkitFontSmoothing: "antialiased" }}>

      {/* Header */}
      <header style={{ maxWidth: "1120px", margin: "0 auto", padding: isMobile ? "40px 20px 24px" : "56px 40px 32px" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, color: "#4B5563", textDecoration: "none", marginBottom: "24px" }}>
          <GraduationCap size={16} />
          <span>Oposita Smart</span>
        </a>
        <h1 style={{ fontSize: isMobile ? "28px" : "38px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "0" }}>
          Radar de Oposiciones 2026
        </h1>
        <p style={{ fontSize: isMobile ? "15px" : "17px", color: "#4B5563", marginTop: isMobile ? "8px" : "12px", maxWidth: "540px" }}>
          Estado actual de las principales convocatorias administrativas. Actualizado constantemente.
        </p>
        <div style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "8px", background: "white", border: "1px solid rgba(0,0,0,0.05)", borderRadius: "99px", padding: "4px 12px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2D6A4F", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "12px", fontWeight: 500, color: "#4B5563" }}>Última actualización: hace 2 horas</span>
        </div>
      </header>

      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: isMobile ? "0 20px" : "0 40px" }}>

        {/* Filters */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "12px" : "16px", alignItems: isMobile ? "flex-start" : "center", marginBottom: "24px" }}>
          <FilterGroup
            options={[
              { value: "todas", label: "Todas" },
              { value: "estado", label: "Estado" },
              { value: "ccaa", label: "CCAA" },
            ]}
            selected={scope}
            onChange={setScope}
          />
          <FilterGroup
            options={[
              { value: "all", label: "C1 + C2" },
              { value: "c1", label: "Solo C1" },
              { value: "c2", label: "Solo C2" },
            ]}
            selected={level}
            onChange={setLevel}
          />
        </div>

        {/* Summary */}
        <div style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: 600, color: "#111827" }}>
            {filtered.length} convocatorias activas{" "}
            <span style={{ color: "#4B5563", fontWeight: 400 }}>·</span>{" "}
            <span style={{ color: "#2D6A4F" }}>{totalPlazas.toLocaleString("es-ES")} plazas totales</span>
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px", color: "#B5B3AF" }}>
            <p>Cargando convocatorias...</p>
          </div>
        )}

        {/* Cards grid */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", marginBottom: "48px" }}>
            {filtered.map((op, i) => (
              <OposicionCard key={op.id || i} op={op} isMobile={isMobile} />
            ))}
          </div>
        )}

        {/* CTA */}
        <section style={{
          borderRadius: "16px", background: "rgba(45,106,79,0.06)", border: "1px solid rgba(45,106,79,0.10)",
          padding: isMobile ? "32px 24px" : "40px 32px", textAlign: "center", marginBottom: "64px",
        }}>
          <h2 style={{ fontSize: isMobile ? "22px" : "26px", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "8px" }}>
            ¿Preparando tu oposición?
          </h2>
          <p style={{ fontSize: isMobile ? "14px" : "16px", color: "#4B5563", maxWidth: "480px", margin: "0 auto 24px" }}>
            Oposita Smart te ayuda a estudiar con repetición espaciada — el método científico más eficaz
          </p>
          <a
            href="https://app.opositasmart.com/#/welcome"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "linear-gradient(145deg, #1B4332, #2D6A4F, #3A7D5C)",
              color: "white", fontWeight: 600, fontSize: "15px",
              padding: "12px 24px", borderRadius: "12px", textDecoration: "none",
              boxShadow: "0 8px 28px rgba(27,67,50,0.20)",
              transition: "all 0.2s",
            }}
          >
            Probar gratis
            <ArrowRight size={16} />
          </a>
          <p style={{ fontSize: "13px", color: "#B5B3AF", marginTop: "16px" }}>1.414 preguntas · 13 temas · Sin compromiso</p>
        </section>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
