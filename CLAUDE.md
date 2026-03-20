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

## SEO

- Google Analytics: G-8EYXHVPJC1
- Microsoft Clarity: uqmifv2fd1
- Sitemap automático (`@astrojs/sitemap`)
- RSS automático (`@astrojs/rss`)
- Schema.org en index (SoftwareApplication)
- Canonical URL: `https://opositasmart-landing.vercel.app`
