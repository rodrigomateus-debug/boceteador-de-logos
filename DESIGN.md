# Boceteador de Logos — Documento de diseño

**Versión:** 1.0 · **Fecha:** julio 2026 · **Estado:** aprobado para arrancar MVP

Herramienta web para armar bocetos de logos sobre productos promocionales
(cuadernos, bolígrafos, gorras, remeras, etc.), al estilo de
[Zakeke](https://www.zakeke.com/) y [Customily](https://www.customily.com/),
pero enfocada en el flujo real de Formas Publicitarias: **subir un logo,
ubicarlo sobre la foto del producto en una zona imprimible definida, y
descargar el boceto para aprobarlo con el cliente.**

---

## 1. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Usuarios | Vendedores internos, clientes finales y revendedores (público, sin registro) |
| Alcance MVP | Solo boceto visual (sin cotización ni archivos de producción, quedan para fases siguientes) |
| Catálogo | Fotos propias cargadas a mano desde un panel de administración |
| Modos de uso | Webapp standalone **y** widget embebible (iframe/script) en cualquier web |
| Entrega del boceto | Descarga como PNG y PDF |
| Cuentas | Solo el panel de admin pide clave; el boceteador es público |
| Stack | Lo elige el equipo técnico (propuesta en §6) |

---

## 2. Los dos flujos principales

### 2.1 Flujo del usuario (boceteador público)

1. **Elegir producto** — grilla de productos con foto, nombre y buscador.
   Si el producto tiene variantes de color, se elige la variante.
2. **Elegir vista** — frente, dorso, lateral, etc. (miniaturas a la izquierda,
   como en las herramientas de referencia).
3. **Subir logo** — arrastrar o seleccionar archivo PNG, JPG o SVG
   (transparencia respetada; SVG rasterizado para el canvas).
4. **Ubicar el logo** — sobre la foto del producto se muestra la **zona
   imprimible** (rectángulo punteado). El logo se puede mover, escalar y
   rotar **solo dentro de la zona** (clamping). La app muestra en vivo el
   tamaño real del logo en cm (ver §4, mapeo px→cm).
5. **Datos del boceto** *(opcionales)* — nombre del cliente, cantidad,
   observaciones.
6. **Descargar** — PNG del boceto (foto + logo compuesto) y PDF con lámina de
   presentación: boceto, nombre del producto, vista, medidas del logo en cm,
   fecha y leyenda legal ("El boceto es orientativo…").

### 2.2 Flujo del administrador (panel con clave)

1. Login simple (una clave compartida en el MVP).
2. **ABM de productos**: nombre, descripción corta, categoría, variantes de
   color (una foto por vista y por variante).
3. **Editor de zonas imprimibles**: sobre cada foto, el admin dibuja el
   rectángulo de la zona y carga sus **medidas reales en cm** (ancho × alto).
   Ese dato es el que permite mostrar medidas reales al usuario.
4. Activar/desactivar productos, ordenar el catálogo.

---

## 3. Modelo de datos

```
Product
├─ id, name, slug, description, category, active, sortOrder
└─ variants: ProductVariant[]

ProductVariant                     # ej: "Negro", "Azul"
├─ id, productId, name, colorHex
└─ views: ProductView[]

ProductView                        # ej: "Frente", "Dorso"
├─ id, variantId, name, imageUrl   # foto del producto (fondo)
├─ imageWidthPx, imageHeightPx
└─ zones: PrintZone[]

PrintZone                          # zona imprimible sobre esa vista
├─ id, viewId, name                # ej: "Frente inferior derecho"
├─ x, y, width, height             # en px relativos a la foto (o fracción 0–1)
├─ rotationDeg
└─ realWidthCm, realHeightCm       # medidas reales → habilita px→cm

Sketch (boceto)                    # se persiste para tener historial
├─ id (nanoid, sirve de URL futura), createdAt
├─ productViewId, zoneId
├─ logoUrl                         # copia del logo subido
├─ placement: { x, y, scale, rotationDeg }   # relativo a la zona
└─ meta: { clientName?, quantity?, notes? }
```

Guardar los `Sketch` desde el día uno (aunque el MVP solo descargue) deja
gratis la puerta abierta al **link compartible** de la fase 2.

---

## 4. El editor (corazón del producto)

- **Canvas 2D** con la foto del producto de fondo, la zona imprimible dibujada
  punteada, y el logo como capa transformable (mover / escalar desde esquinas /
  rotar). Librería propuesta: **Konva** (`react-konva`) — transformadores
  listos, buen rendimiento, exporta a imagen nativamente.
- **Clamping a la zona**: el bounding box del logo no puede salir de la zona.
  Escalado siempre proporcional (sin deformar el logo).
- **Mapeo px→cm**: `cmPorPx = realWidthCm / zone.width`. Con eso se muestra en
  vivo "Logo: 5,70 × 2,52 cm (14,4 cm²)" como en la referencia.
- **Snapping** al centro horizontal/vertical de la zona (guías magnéticas).
- **Export PNG**: `stage.toDataURL()` a 2× para calidad. **Export PDF**:
  cliente-side con `jspdf`, armando la lámina de presentación.
- Deshacer/rehacer simple (pila de estados del placement).
- Mobile: gestos táctiles (Konva los soporta); el layout del editor colapsa a
  una columna.

**Fuera del MVP (explícitamente):** texto sobre el producto, cliparts, quita
de fondo con IA, multi-logo por zona, 3D/AR. Todas las referencias los tienen,
pero ninguno es necesario para validar el boceto visual.

---

## 5. Standalone + embebible con una sola base de código

La misma app sirve los dos modos:

- **Standalone**: `bocetos.formaspublicitarias.com` — catálogo completo +
  editor.
- **Embed**: la ruta `/embed` renderiza la app sin header/footer, pensada para
  iframe. Se distribuye un snippet:

```html
<script src="https://bocetos.formaspublicitarias.com/widget.js"
        data-product="cuaderno-freedom"></script>
```

`widget.js` inyecta el iframe (responsive, con `postMessage` para altura
dinámica) y acepta parámetros: `data-product` (abrir directo en un producto),
`data-lang`, y a futuro `data-theme` (colores del sitio anfitrión) y callbacks
JS (`onSketchDownloaded`) para que el sitio anfitrión reaccione. Cabeceras:
no enviar `X-Frame-Options` restrictivo en `/embed`; usar
`Content-Security-Policy: frame-ancestors` configurable si se quiere limitar
quién puede embeber.

---

## 6. Stack propuesto

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Front + API + panel admin en un solo deploy; SSR para el catálogo |
| Editor | **react-konva + jspdf** | Ver §4 |
| Base de datos | **Postgres + Prisma** (Neon/Supabase free tier) | El modelo es relacional simple; free tier alcanza de sobra |
| Imágenes | **Cloudflare R2 o Vercel Blob** | Fotos de producto y logos subidos; barato y con CDN |
| Auth admin | Clave única en variable de entorno + cookie de sesión | Suficiente para MVP; migrable a cuentas reales en fase 4 |
| Deploy | **Vercel** | Deploy por git push, previews automáticas, dominio propio |

Costo estimado del MVP en producción: **~USD 0–5/mes** (free tiers).

## 7. Estructura del proyecto

```
/app
  /(public)           # catálogo + editor (standalone)
  /embed              # mismo editor, layout mínimo para iframe
  /admin              # panel: productos, vistas, zonas
  /api                # products, upload, sketches
/components/editor    # canvas Konva, transformador, export PNG/PDF
/lib                  # prisma, px↔cm, storage
/public/widget.js     # snippet embebible
```

## 8. Roadmap

| Fase | Contenido |
|---|---|
| **1 — MVP** (este diseño) | Catálogo, editor, export PNG/PDF, admin de productos y zonas, modo embed |
| **2 — Compartir** | Link compartible por boceto (`/b/{id}`) con botón "Aprobar", envío por mail, historial de bocetos |
| **3 — Cotización** | Técnicas de aplicación por zona, precio por cantidad/tamaño, markup del revendedor (como la captura de referencia) |
| **4 — Producción y escala** | Archivo de producción con medidas reales, cuentas de vendedores/revendedores, catálogo por API de proveedores, quita de fondo IA, texto/clipart |

## 9. Sistema de diseño visual

Decisión: la interfaz usa el **design system de Formas Publicitarias**, el
mismo del "Boceto de producción" oficial (ficha A4 de PDV). Así el boceteador,
las fichas y la papelería de la empresa hablan el mismo idioma visual, y el
PDF que exporta la app queda de la familia de los documentos existentes.

Fuente de verdad: el template del Boceto de producción (skill
`boceto-produccion-formas`). Los tokens de abajo están extraídos de ahí.

### 9.1 Tokens de color

| Token | Valor | Uso |
|---|---|---|
| `--formas-navy` | `#000085` | Titulares, marca, pills, iconografía fuerte |
| `--formas-lime` | `#8EE021` | **Acento por defecto**: CTA principal, zona imprimible activa, barritas |
| `--formas-green` | `#399F4A` | Eyebrow "your brand loved", estados OK |
| `--formas-ink` | `#0B0B23` | Texto principal |
| `--formas-gray-700` | `#3D3D55` | Texto cuerpo |
| `--formas-gray-500` | `#6E6E85` | Texto secundario, labels |
| `--formas-gray-200` | `#E4E4ED` | Bordes y divisores |
| `--formas-gray-100` | `#F1F1F6` | Slots de imagen, fondos hundidos |
| `--formas-gray-50` | `#F8F8FB` | Paneles hundidos |
| Fondo de página | `#EDEDF2` (app) / `#FFFFFF` (hoja) | — |

Acentos alternativos de marca (para variar por sección o campaña):
`#000085` navy, `#EF7958` coral, `#089AE1` celeste, `#E20389` magenta,
`#F9CE32` amarillo. El acento se define como `--sheet-accent` y es
intercambiable sin tocar el resto.

### 9.2 Tipografía

| Rol | Fuente | Notas |
|---|---|---|
| Display (títulos) | **Montserrat 700/800/900** | Siempre en navy, `letter-spacing: -0.01em`, línea apretada |
| UI y cuerpo | **Poppins 400–800** | Botones, formularios, texto |
| Labels | Poppins 600/700, 10–11 px | UPPERCASE con `letter-spacing: 0.14–0.22em` |
| Datos técnicos / hex | `ui-monospace` | Códigos de color, medidas auxiliares |

En la webapp se self-hostean con `@fontsource/montserrat` y
`@fontsource/poppins` (el template original las importa de Google Fonts; en
producción evitamos el CDN externo).

### 9.3 Motivos y componentes del lenguaje Formas

- **Radios generosos**: 12–16 px en tarjetas y barras, 24 px en el marco del
  canvas, pills `999px` (navy con texto blanco, ej. "Vista principal").
- **Barrita de acento**: subrayado de 4 px × 56 px bajo títulos de producto;
  borde izquierdo de 4 px en celdas de especificación.
- **Slots de imagen**: fondo `#F1F1F6` con rayado diagonal navy al 5 %
  (`repeating-linear-gradient(-45deg, …)`) — se usa para el placeholder del
  logo y la galería de vistas.
- **Barrita de medida**: línea con tics en los extremos y la medida en
  Montserrat 800 al centro (igual que en la ficha A4) — en el editor es el
  indicador vivo de cm del logo.
- **Meta strips**: grillas con bordes `--formas-gray-200`, celdas divididas,
  label uppercase arriba y valor en bold abajo.
- **Botón primario**: fondo lima, texto navy 700, radio 12 px. Secundario:
  borde gris sobre blanco. El lima aparece una vez por pantalla como jerarquía
  máxima.
- **Eyebrow institucional**: "your brand loved" en verde, uppercase,
  `letter-spacing: 0.22em` — reservado a header/footer institucionales.
- **PDF exportado**: reutiliza directamente el layout del Boceto de
  producción A4 (mismo template), con la foto compuesta del canvas en el slot
  `FOTO_PRODUCTO` y el logo en `LOGO_CLIENTE`. El boceteador se vuelve el
  generador natural de esas fichas.

### 9.4 Tema oscuro

La identidad Formas es blanca/luminosa; la app es **light-first**. Se ofrece
un modo oscuro adaptado (no invertido): fondos en escala de la tinta
(`#0B0B23` → `#1A1A38`), el lima intacto como acento (funciona muy bien sobre
oscuro), y el navy de titulares aclarado a un periwinkle `#9D9DFF` para
mantener contraste. Implementado por tokens CSS con `prefers-color-scheme` +
toggle `data-theme`.

Vista previa navegable del sistema aplicado al editor: ver artifact
"Boceteador — sistema de diseño Formas" (link en el hilo del proyecto).

## 10. Riesgos y cuidados

- **Calidad de logos subidos**: JPG con fondo blanco arruina el boceto sobre
  productos oscuros → avisar al usuario cuando el logo no tiene transparencia
  (fase 4: quita de fondo automática). Aceptar SVG desde el día 1 ayuda.
- **Fidelidad del boceto**: dejar siempre visible la leyenda "El boceto es
  orientativo y podrá tener adaptaciones" (igual que la referencia).
- **Fotos de producto**: conviene definir un estándar de carga (fondo neutro,
  producto centrado, resolución mínima ~1500 px) para que las zonas queden
  consistentes.
- **Logos ajenos** (ej. marcas registradas): el boceto es responsabilidad del
  cliente; sumar un disclaimer en el PDF.
