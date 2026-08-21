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

## PDF editable para CorelDRAW

El botón **"PDF editable (Corel)"** genera un PDF clásico donde cada texto,
recuadro e imagen es una pieza suelta y movible.

Ese PDF lleva **las tipografías de marca incrustadas adentro** (Poppins Regular,
SemiBold y Bold, y Montserrat ExtraBold, subseteadas al set latino). Es
importante que siga siendo así: si el PDF sólo *nombra* las fuentes en vez de
incluirlas, Corel las sustituye por otras, cambian los anchos de cada letra y
los textos se corren y se desbordan de los recuadros.

Dos detalles a no romper si se toca `corelSheet()`:

- Cada cara se registra con **su propio nombre PostScript** y estilo `normal`.
  Si se las registrara como estilos de una misma familia, jsPDF les pone el
  mismo `/BaseFont` a todas y Corel termina aplicando una sola cara a todo.
- Todo texto de largo variable (cliente, producto, técnica, posición…) va con
  `maxW` y pasa por `fit()`, que achica el cuerpo hasta que entra. Sin eso, un
  nombre de cliente largo se monta sobre la columna de al lado.

## Ramas y entornos de prueba

El sitio de Netlify publica **cada rama en su propia URL** (Branch deploys),
con las mismas funciones serverless y variables de entorno que producción,
así que la IA funciona igual en todas:

| Rama | Para qué | URL |
|---|---|---|
| `main` | **Producción.** Solo recibe merges desde `dev` ya validados | https://formas-bocetos-con-logo.netlify.app |
| `dev` | Preproducción: acá se junta y se prueba lo que va a salir | https://dev--formas-bocetos-con-logo.netlify.app |
| `jp-code` | Arenero de Juan Pedro: pruebas jugadas, sin compromiso | https://jp-code--formas-bocetos-con-logo.netlify.app |

El flujo: se trabaja en `jp-code` (o en ramas propias), lo que sobrevive se
mergea a `dev`, se valida en la URL de `dev`, y recién entonces `dev` se
mergea a `main`. **Nada sube solo de una rama a la otra.** Cada push a una
rama actualiza su URL en segundos; si se usan pull requests, Netlify además
publica una URL temporal por PR (Deploy Previews) para revisar antes de
mergear.

## App publicada

**https://formas-bocetos-con-logo.netlify.app/** (Netlify). `index.html`
redirige al generador. Para actualizarla: volver a arrastrar la carpeta en
Netlify Drop, o mejor, conectar el sitio al repo de GitHub (Netlify →
Site configuration → Build & deploy → Link repository, rama `main`) para que
cada cambio se publique solo.

## Mejorar la foto con IA (OpenAI)

En el generador, debajo de "Foto del producto", hay dos botones que mandan la
foto a la IA de OpenAI y devuelven una versión mejorada para comparar
antes/después y decidir si se usa:

- **✨ Fondo blanco** — recorta el producto y lo presenta estilo e-commerce:
  fondo blanco puro, centrado, sombra de contacto suave.
- **✨ En situación** — muestra el producto en una escena de uso real (oficina,
  evento, cafetería…), nítido en primer plano con el fondo desenfocado.

El "estilo Formas" (reglas de marca: no tocar el producto ni su logo, look
luminoso y profesional, sin texto agregado) vive en el servidor, en
`netlify/functions/ia-imagen.mjs`, junto con el prompt de cada modo. Para
ajustar el estilo se edita ese archivo, no el HTML.

**Cómo funciona por dentro:** el navegador nunca ve la API key. Le pega a la
función de Netlify con una clave compartida (header `x-formas-clave`, se pide
una sola vez y queda en el navegador); la función crea el trabajo en la
Responses API de OpenAI en modo *background* y el navegador consulta el estado
cada 4 segundos. Así ninguna llamada supera el límite de 26 s de las funciones
sincrónicas de Netlify aunque la imagen tarde minutos.

**Puesta en marcha** (Netlify → Site configuration → Environment variables):

| Variable | Qué es |
|---|---|
| `OPENAI_API_KEY` | Obligatoria. Key de https://platform.openai.com |
| `FORMAS_IA_CLAVE` | Obligatoria. Clave compartida que la app le pide al usuario |
| `OPENAI_MODEL` | Opcional. Modelo conductor (default `gpt-5-mini`) |
| `OPENAI_IMAGE_QUALITY` | Opcional. `low` / `medium` / `high` (default `medium`) |

Después de setearlas hay que redesplegar el sitio. Costo orientativo: unos
centavos de dólar por imagen en calidad media. Para probar en local:
`npx netlify dev` (levanta la app con las funciones incluidas).

La imagen generada es **orientativa**: la IA puede alterar detalles del
producto o del logo, por eso el comparador obliga a revisar antes de aceptar.
La ficha técnica y el PDF de Corel siguen usando la foto que elijas vos.

Alrededor de la mejora hay tres comodidades más:

- **⬇ Descargar** en el comparador baja la imagen generada sola (PNG con el
  nombre del boceto), lista para mandarle al cliente por WhatsApp o mail.
- **⬇ Descargar esta foto**, debajo del recuadro de la foto, baja en cualquier
  momento la imagen que esté en uso (también sirve para el boceto compuesto).
- Al aceptar una mejora aparece el selector **Foto IA / Foto anterior** para
  intercambiar entre las dos versiones y ver cómo queda cada una en la ficha.
  El par se recuerda por hoja mientras trabajás (no viaja en las plantillas,
  para no duplicar su peso), y se descarta al subir una foto nueva o rehacer
  el boceto.

## Plantillas en Google Drive

**Ya está configurado.** Cada usuario entra a la app publicada, toca
**☁ Conectar Google Drive**, autoriza con su cuenta de `formas.ar` y sus
plantillas quedan en una carpeta "Plantillas Boceteador Formas" de su propio
Drive: sin límite de cantidad y a prueba de limpiezas de caché. En la lista,
☁ son las de Drive y 💾 las de este navegador.

La app pide únicamente el permiso `drive.file`, que da acceso solo a los
archivos que ella misma crea — no puede ver el resto del Drive del usuario.

Si alguna vez hay que rehacer la credencial (cambio de dominio, otro proyecto
de Google Cloud), el procedimiento original quedó documentado abajo.

<details>
<summary>Configuración de la credencial (ya hecha — referencia)</summary>

Requiere dos cosas, que se configuran una única vez para toda la empresa:

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
plantillas, autoriza con su cuenta, y listo.

El Client ID vigente está en la constante `GD_DEFAULT_CLIENT_ID` de
`generador-bocetos.html`. Es público por diseño (va en el código del navegador,
como en cualquier web): lo que autoriza el acceso es la lista de orígenes de la
credencial en Google Cloud. Cada usuario también puede pegar otro con el botón
**⚙ Cambiar ID de Drive**.

</details>

## Estado

- [x] Diseño (DESIGN.md) con el design system oficial de Formas
- [x] Boceteador: área de impresión + logo con medidas reales (regla o medida exacta)
- [x] Generador integrado (boceteador como modal, ficha A4 autocompletada)
- [x] Ejecutivos en desplegable, multi-color de impresión (HEX/Pantone), barras de medida arrastrables, Nuevo boceto / Limpiar
- [ ] Fase 2 — Links compartibles y aprobación del cliente
- [ ] Fase 3 — Cotización conectada (ver `cotizador-formas.html`)
- [ ] Fase 4 — Archivos de producción, cuentas, catálogo por API
