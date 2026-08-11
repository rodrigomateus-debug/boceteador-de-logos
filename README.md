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

## App publicada

**https://formas-bocetos-con-logo.netlify.app/** (Netlify). `index.html`
redirige al generador. Para actualizarla: volver a arrastrar la carpeta en
Netlify Drop, o mejor, conectar el sitio al repo de GitHub (Netlify →
Site configuration → Build & deploy → Link repository, rama `main`) para que
cada cambio se publique solo.

## Plantillas en Google Drive (configuración inicial, una sola vez)

Las plantillas se guardan por defecto en el navegador. Conectando Google Drive,
cada usuario las guarda en su propia cuenta: no se pierden al limpiar el caché
y no tienen límite de cantidad. Requiere dos cosas, que se configuran una única
vez para toda la empresa:

### 1. Publicar la app en una URL web

Google no permite la conexión con Drive desde un archivo abierto con doble clic
(`file://`); la app tiene que servirse desde una URL. Opciones:

- **GitHub Pages** (recomendado): en este repo → Settings → Pages →
  "Deploy from a branch" → rama `main`, carpeta `/ (root)` → Save.
  La app queda en `https://<usuario>.github.io/boceteador-de-logos/generador-bocetos.html`.
  *Nota: si el repo es privado, GitHub Pages requiere plan pago — la
  alternativa es hacerlo público o usar la opción siguiente.*
- **Netlify Drop** (gratis, arrastrar y soltar): entrá a
  [app.netlify.com/drop](https://app.netlify.com/drop) y arrastrá la carpeta
  con el HTML. Te da una URL `https://<nombre>.netlify.app`.

### 2. Crear el Client ID de Google (10 minutos)

1. Entrá a [console.cloud.google.com](https://console.cloud.google.com) con la
   cuenta de Google de la empresa y creá un **proyecto nuevo** (ej. "Boceteador Formas").
2. **APIs y servicios → Biblioteca** → buscá **Google Drive API** → **Habilitar**.
3. **APIs y servicios → Pantalla de consentimiento OAuth** → tipo **Interno**
   (si usan Google Workspace; si no, "Externo" y agregá los mails del equipo
   como usuarios de prueba) → nombre de la app: "Boceteador Formas" → Guardar.
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**
   → tipo **Aplicación web** → en **Orígenes de JavaScript autorizados** agregá
   exactamente: `https://formas-bocetos-con-logo.netlify.app` → Crear.
5. Copiá el **ID de cliente** (termina en `.apps.googleusercontent.com`).
6. Pegalo en `generador-bocetos.html`, en la constante `GD_DEFAULT_CLIENT_ID`
   (buscala en el archivo), y subí el cambio. Así todo el equipo lo tiene ya
   configurado. (Alternativa rápida sin editar el archivo: cada usuario lo pega
   una vez cuando la app se lo pide al tocar "Conectar Google Drive".)

Después de eso, cada usuario toca **☁ Conectar Google Drive** en el panel de
plantillas, autoriza con su cuenta, y listo: sus plantillas se guardan en una
carpeta "Plantillas Boceteador Formas" de su Drive (☁ en la lista; las del
navegador aparecen con 💾).

## Estado

- [x] Diseño (DESIGN.md) con el design system oficial de Formas
- [x] Boceteador: área de impresión + logo con medidas reales (regla o medida exacta)
- [x] Generador integrado (boceteador como modal, ficha A4 autocompletada)
- [x] Ejecutivos en desplegable, multi-color de impresión (HEX/Pantone), barras de medida arrastrables, Nuevo boceto / Limpiar
- [ ] Fase 2 — Links compartibles y aprobación del cliente
- [ ] Fase 3 — Cotización conectada (ver `cotizador-formas.html`)
- [ ] Fase 4 — Archivos de producción, cuentas, catálogo por API
