# INGENIER.IA — Etapa 1: Sistema Básico de Producción

Proyecto Next.js + TypeScript + Tailwind con el módulo de captura y cálculo del Sistema Básico de Producción.

## Requisitos
- Node.js 18+

## Instalación
```bash
npm install
npm run dev
```

## Estructura
- `components/SistemaBasicoProduccion.tsx`: componente principal con la lógica acordada.
- `app/page.tsx`: página raíz que monta el componente.

## Notas de cálculo
- Cálculo interno a 6 decimales; UI muestra 3.
- Tiempos observados se capturan a nivel de **SKU** (campo único separado por comas).
- TR (fracción) = promedio tiempos del SKU.
- TE (fracción) = (TR × Valoración × Holgura) / 60.
- Resumen por SKU = promedio de TR y TE de sus fracciones.
