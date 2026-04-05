# CLAUDE.md — Opositasmart Landing + Blog

## Proyecto

Landing page + blog de Oposita Smart. Stack: Astro + Vercel.

## Estructura

```
src/
├── components/        # Header, Footer, BlogCard, CTABanner, ThemeToggle
├── content/blog/      # Posts en Markdown (content collection)
├── layouts/           # BaseLayout, BlogLayout
├── pages/             # index, blog/, privacidad, rss.xml
└── styles/global.css  # Design system (green default, purple toggle)
```

## Comandos

```bash
npm run dev       # Dev server
npm run build     # Build producción
npm run preview   # Preview local
```

## Deploy

Vercel (auto-deploy en push a `main`). URL: `https://opositasmart-landing.vercel.app`

## Temas de color

- **Green (default):** Editorial Calm — forest green (#2D6A4F)
- **Purple (toggle):** Classic purple (#6D28D9)
- Toggle en Header, persiste en localStorage (`os-theme`)
- Las CSS vars `--green-*` se sobreescriben en `[data-theme="purple"]`

## Blog — Reglas de escritura humana

**OBLIGATORIO**: Usar el skill `/write-blog` para crear artículos. El skill incluye:

### Frases PROHIBIDAS en blog posts
- "Es importante destacar que..."
- "Cabe señalar que..."
- "No es de extrañar que..."
- "En definitiva..." / "En conclusión..."
- "Sin lugar a dudas..."
- "Resulta fundamental..."
- "No se trata solo de X, sino de Y"
- Cualquier frase que suene a paper académico o comunicado de prensa

### Patrones AI a evitar
- Estadísticas sin fuente (NO inventar porcentajes)
- Listas siempre de 3 items
- Todas las secciones con la misma estructura
- Hedging: "podría argumentarse que...", "en cierto sentido..."
- Atribuciones vagas: "según estudios", "los expertos dicen"
- Conclusiones motivacionales vacías

### Lo que SÍ debe tener cada post
- Primera persona (al menos 3 veces)
- Al menos 1 anécdota o ejemplo concreto con artículos de ley
- Opiniones directas, no hedging
- Párrafos de longitud variable
- Tono conversacional (como hablar de oposiciones en un café)
- Cada estadística con fuente o caveat
- 1 mención natural a Oposita Smart (no bloque CTA separado)

### Referencia
- Skill completo: `.claude/commands/write-blog.md`
- Basado en: Wikipedia "Signs of AI writing", humanizer skill patterns, Google E-E-A-T guidelines

## Content Collection

Frontmatter requerido para posts:
```yaml
title: "..."
description: "... (150-160 chars)"
date: YYYY-MM-DD
category: convocatorias | metodo | guias | temario | experiencias
emoji: "..."
readingTime: "X min lectura"
```

## React Islands

El proyecto usa `@astrojs/react` para componentes interactivos:

```
src/components/react/
├── RadialGraph.jsx      # Grafo D3 radial de organismos públicos (/graph)
├── RadarPage.jsx        # Radar de convocatorias con Supabase (/radar)
├── TestDiagnostico.jsx  # Test diagnóstico de 50 preguntas (/diagnostico)
├── OrganismosPage.jsx   # Versión force-graph (legacy, replaced by RadialGraph)
└── organismos-data.js   # Datos de 19 organismos + 10 ministerios
```

Montar con `client:only="react"` para páginas standalone (graph, radar, diagnostico).
Montar con `client:visible` para componentes dentro de páginas Astro.

### Grafo Radial — Patrón CivLab

Referencia: `sfgov.civlab.org` — grafo SVG radial de gobierno municipal SF.

**Arquitectura del SVG (aprendida del source code de CivLab):**
- SVG con `viewBox` y `preserveAspectRatio="xMidYMid meet"` para auto-escalar
- Centro en (400, 375) con `transform="translate(400, 375)"`
- **3 anillos concéntricos** con radio fijo, dashed circles como guías
- **Nodos distribuidos uniformemente** en cada anillo (equi-espaciados trigonométricamente, NO con D3 tree layout)
- **Formas diferentes por nivel**: círculos (elected), rects rotados/diamonds (commission), hexágonos/paths (advisory), rects (department)
- **Color por anillo**: cada nivel tiene un color distinto (stroke del nodo = color del anillo)
- **Nodos blancos** con stroke del color del anillo — seleccionados cambian fill
- **Tamaño variable** por importancia (r=10-21px según datos)
- **Labels** del anillo posicionados en cy = centro + radio, con el color del anillo
- **Grupos SVG separados** por anillo: `g#ring-elected-unselected`, `g#ring-commission-unselected`

**Nuestro grafo (`RadialGraph.jsx`):**
- Usa `d3-hierarchy` tree() + polar projection para calcular posiciones
- SVG puro renderizado con React (no canvas, no force-graph)
- Rotación animada al seleccionar un nodo (el nodo seleccionado va a las 12)
- Labels counter-rotan para mantenerse horizontales
- Panel lateral con tabs (convocatorias, datos históricos con recharts, noticias)
- Dependencias: `d3-hierarchy`, `d3-shape`, `recharts`, `lucide-react`

## Dominios

- Landing: `www.opositasmart.com` (Cloudflare → Vercel)
- Webapp: `app.opositasmart.com` (CNAME → Vercel)
- Links de CTA en landing apuntan a `https://app.opositasmart.com/#/welcome`

## SEO

- Google Analytics: G-8EYXHVPJC1
- Microsoft Clarity: uqmifv2fd1
- Sitemap automático (`@astrojs/sitemap`)
- RSS automático (`@astrojs/rss`)
- Schema.org en index (SoftwareApplication)
- Canonical URL: `https://opositasmart-landing.vercel.app`
