# Boceteador de Logos — Formas Publicitarias

Herramientas web para armar bocetos de logos sobre productos promocionales y
generar la ficha de producción oficial. Todo son archivos HTML autocontenidos:
se abren directo en el navegador, sin instalación.

## Archivos

| Archivo | Qué es |
|---|---|
| **`generador-bocetos.html`** | ⭐ **La app principal.** Generador de bocetos (formulario + ficha A4 de producción en vivo) con el boceteador "Cargá tu logo" integrado como modal: subís la foto del producto, marcás el área, aplicás el logo (tinte, opacidad, rotación, quita de fondo) y la ficha se completa sola (foto compuesta, logo, medidas, técnica, posición). Imprime a PDF y descarga HTML. |
| `boceteador.html` | El boceteador standalone (versión previa a la integración; el modal del generador es su evolución). |
| `cotizador-formas.html` | Maqueta funcional del cotizador (fase 3 del roadmap): técnica, cantidades, desglose de precio y markup. |
| `DESIGN.md` | Documento de diseño: flujos, modelo de datos, sistema de diseño Formas, roadmap. |

## Estado

- [x] Diseño (DESIGN.md) con el design system oficial de Formas
- [x] Boceteador: área de impresión + logo con medidas reales (regla o medida exacta)
- [x] Generador integrado (boceteador como modal, ficha A4 autocompletada)
- [x] Ejecutivos en desplegable, multi-color de impresión (HEX/Pantone), barras de medida arrastrables, Nuevo boceto / Limpiar
- [ ] Fase 2 — Links compartibles y aprobación del cliente
- [ ] Fase 3 — Cotización conectada (ver `cotizador-formas.html`)
- [ ] Fase 4 — Archivos de producción, cuentas, catálogo por API
