# Boceteador de Logos — Formas Publicitarias

Herramientas web para armar bocetos de logos sobre productos promocionales y
generar la ficha de producción oficial. Todo son archivos HTML autocontenidos:
se abren directo en el navegador, sin instalación.

## Archivos

| Archivo | Qué es |
|---|---|
| **`generador-bocetos.html`** | ⭐ **La app principal.** Generador de bocetos (formulario + ficha A4 de producción en vivo) con el boceteador "Cargá tu logo" integrado como modal: subís la foto del producto, marcás el área, aplicás el logo (tinte —blanco, negro, grabado o **un color a elección**, con código HEX o Pantone del mismo buscador de la ficha—, opacidad, rotación, **quitar el fondo o cualquier color** —blanco, negro, uno del selector o tomado con el cuentagotas tocando el logo— y **✨ Modificar logo con IA**) y la ficha se completa sola (foto compuesta, logo, medidas, técnica, posición). El lienzo del boceteador ocupa toda la altura de la pantalla. La vista previa de la ficha tiene zoom (botones arriba a la derecha o Ctrl + rueda; «1:1» muestra el tamaño real de impresión para revisar la calidad de la foto). Acepta logos en PNG, JPG, SVG, PDF y .ai de Illustrator (guardados con compatibilidad PDF, que es el default). Trae de **formas.shop** el nombre, el color, las fotos y las medidas del producto, y lo mide solo sobre la foto (ver «Traer de formas.shop»). Imprime a PDF y descarga HTML. |
| `boceteador.html` | El boceteador standalone (versión previa a la integración; el modal del generador es su evolución). |
| `cotizador-formas.html` | Maqueta funcional del cotizador (fase 3 del roadmap): técnica, cantidades, desglose de precio y markup. |
| `DESIGN.md` | Documento de diseño: flujos, modelo de datos, sistema de diseño Formas, roadmap. |

## Traer de formas.shop y medir el producto solo

En la ficha, arriba de «Nombre del producto», **Traer de formas.shop** acepta el
link del producto (`https://formas.shop/app/product/detail/18953`), su código
(`18953`) o parte del nombre: mientras se escribe aparecen los primeros 5 que
coinciden, con su foto y los talles de un mismo color juntos (se eligen con el
mouse o con ↑ ↓ y Enter). Al elegirlo:

1. completa la ficha: **nombre**, **color** (con su muestra, si el nombre del
   color es conocido) y las **observaciones** (material y medidas; solo si
   estaban vacías o eran de un producto traído antes);
2. baja las fotos de la tienda y las del proveedor, lee de la descripción las
   **medidas** («Medidas cerrado: 14 × 9 cm», «Ø 8,4 × 30 cm», «Dimensiones:
   21 × 14 × 1,4 cm», en cm o mm) y las **áreas de impresión** («Frente: 60 × 15 mm»,
   o varias en un renglón como en los textiles: «Frente (10 × 10 cm), espalda
   (22 × 9,8 cm) y mangas (8 × 8 cm)»), y mide cada foto para elegir la que está
   **de frente**;
3. al tocar «Creá el boceto con tu logo», el boceteador abre ya en «Sé la medida
   del producto», con esa foto puesta, **la escala calibrada sola** y el producto
   marcado con el **recuadro azul punteado** y su medida. **Hay una sola forma de
   medir: ese recuadro** (no hay regla aparte). Para que no se confunda con el área
   de impresión, son bien distintos: la **medida del producto** es azul, punteada
   fina como una cota, con manijas cuadradas y la etiqueta «📏 Medida del producto ·
   8,79 × 27,53 cm» arriba; el **área de impresión** es lima, de línea continua con
   relleno, manijas redondas y la etiqueta «Área de impresión · Grabado láser · 3,49
   × 12,30 cm» abajo. En el panel, cada sección lleva su muestra del mismo color. Queda a la vista junto con el área de
   impresión, para ver enseguida si algo no cierra; al cargar el logo se oculta
   solo y queda solo el área («Ver la medida» lo vuelve a mostrar).
   **«Medida real del producto»** son dos campos, **↔ ancho × ↕ alto**, que muestran lo
   que mide el recuadro; si uno no es el real se corrige y la escala se ajusta a
   ese lado. Abajo, como referencia y en el mismo orden, **«Medida del proveedor:
   9 × 29 cm»** con «✓ coincide» o «⚠ difiere 6,9 %».
   **El recuadro se ajusta**: si el detector agarró mal los bordes (la birome de
   costado, la tapa, una sombra), se arrastran sus esquinas o lados hasta los
   bordes reales (agarrándolo de la línea punteada se mueve entero, sin cambiar
   de tamaño). Como en el logo, el ancho y el alto van **anclados (🔗)**: al
   agrandar o achicar, el recuadro mantiene la forma del producto y la medida no
   cambia (cambia la escala: se está encajando el producto en la foto); escribir el
   ancho mueve el alto en proporción. **Sueltos**, cada lado se mueve por su cuenta
   y el que se mueve cambia su medida. Arranca anclado cuando la proporción se
   conoce (la medida de la descripción) y suelto con una foto propia. Se guarda con
   la medida («Guardar medida y área para todos»).
   Con una **foto propia** (o si el producto no se encuentra solo) el recuadro sale
   sobre la silueta, o al medio: se lleva a los bordes del producto y se anota su
   ancho o su alto («Medir solo» también lo busca con esas medidas). La única foto
   sin recuadro es la de 360° del proveedor, donde la escala sale de su área.
4. en el paso 2, las áreas de la descripción del shop que no están entre las del
   proveedor (en una remera: pecho, espalda) son botones que las marcan **a medida
   real** sobre la foto. Las del proveedor se eligen tocando su foto; solo si una
   foto tiene varias (el dorso y el frente superior de un vaso), hay botones para
   elegir cuál. Arriba quedan las
   fotos del shop para cambiarla (✓ = de frente, se mide sola; ~ = con dudas; sin
   marca = sirve para mostrar, no para medir; borde punteado = del proveedor), y
   se puede subir una propia;

Los productos de **Zecat** traen además las áreas del proveedor: cada una con
**su propia foto de ese color**, el recuadro marcado sobre la foto y su medida
en cm. En esas fotos (marca ▣ en la galería) **la escala sale del recuadro del
área**, que mide lo que dice el proveedor. Así se ubican al milímetro aunque la
descripción no traiga las medidas del producto. El recuadro del producto igual
marca **de punta a punta**, con la medida que da esa escala, y si la descripción
trae las medidas se comparan (son dos fuentes independientes): en la Hydra Go
1,2 L la escala del proveedor da 29,09 cm y la descripción dice 29 (0,3 %). Si no
coinciden, se ve en «⚠ difiere»; si el recuadro del área no guarda la proporción
de sus cm, vale el lado que cierra con la descripción. En las fotos de 360° (el
área desplegada viene dibujada encima) no hay recuadro del producto.

Mientras se trae el producto (bajan y se miden las fotos), «Creá el boceto con tu
logo» queda bloqueado: se habilita cuando terminó, para no abrir un boceto a medias.
Para cambiar de producto se vuelve a escribir en el mismo campo: el código o link
del producto traído se reemplaza con lo que se escribe y la lista vuelve a salir.

Si ya había un boceto, traer otro producto lo cambia: el boceteador abre con la
foto, la escala y el área del producto nuevo, y **los logos siguen puestos** con
su medida real, en el área nueva (si no entran, el paso 3 lo avisa). Si la hoja
tenía aplicado el boceto de otro producto (otro nombre u otro color), esa foto se
saca y el aviso lo dice: se abre el boceto y se aplica de nuevo.

### Área de impresión sugerida

Al abrir el boceteador con un producto del shop (o al tocar «📐 Medir solo»), el
área de impresión **ya viene aplicada**: al tamaño real y en una parte lisa del
producto, esquivando bandas, anillados, costuras, cierres o el bolígrafo de
costado, con 3 mm de aire. Si la descripción trae el área, va esa (la primera que
es del frente; las del dorso o los laterales quedan como botones para usar con la
foto de esa cara). Si no la trae, va un **área estimada**: la más grande que entra
limpia. El aviso del paso 2 dice cuál es y si quedó tocando algún borde. Se mueve y
se agranda como siempre.

En una prueba con 40 productos al azar del catálogo, 32 áreas quedaron bien
puestas, 4 aceptables y 4 mal (fotos de la espalda o con la caja abierta).

### El área depende de la técnica

El paso 1 arranca con la **técnica**, arriba de las fotos: se elige una sola vez,
ahí, porque define la foto y el área. El paso 4 («Colores y aplicación») solo la
muestra, con «Cambiar», que lleva al paso 1; si falta, lo avisa y no deja aplicar. Una serigrafía rotativa envuelve todo el producto; una
tampografía entra en pocos cm. Al elegirla, **la foto y el área se acomodan
solas**, en este orden:

1. lo que alguien **guardó para esa técnica** en ese producto (con su foto);
2. el **área del proveedor que admite esa técnica**, en su foto: la principal o,
   para las rotativas (360°), la que envuelve el producto (Zecat también lista la
   rotativa en los laterales chicos);
3. el área de la descripción o la estimada, como antes.

Siempre **dentro del límite de la técnica**: el máximo que da el proveedor para
esa área (por ejemplo, DTF hasta 14 × 14 cm) y el de la tabla de producción, el
menor de los dos. Si el proveedor no lista la técnica elegida, el aviso lo dice y
nombra las que admite.

En los productos de Zecat la técnica arranca **propuesta** (la primera del área
principal); se cambia cuando haga falta. Los logos que ya estaban puestos siguen
al cambiar de foto, con su **medida real** y en el mismo lugar del área.

**Las que van para el producto**, marcadas con ✓ y arriba en el selector («Para
este producto»): las del **cotizador de Formas** para su tipo (la categoría madre
de STP: «Bolígrafos» → tampografía, láser y digital; «Remeras» → bordado y DTF
hasta 29 × 29 cm) y las de las áreas del proveedor. Las demás se pueden elegir
igual («Otras técnicas»), con un aviso de que no figuran para ese producto. Los
máximos del cotizador también cuentan como límite.

Las técnicas: DTP Full Color, DTF, **Serigrafía plana**, **Serigrafía rotativa
(360°)**, Tampografía, Grabado láser, **Láser rotativo (360°)**, **Impresión UV**,
**UV rotativa (360°)**, Bordado, **Hot stamping**, Vinilo y Sublimación (y «Otra…»).
Los 34 nombres de técnica de Zecat («Tampografia Boligrafos», «Transfer DTF
Gorras», «Laser CO2»…) caen en estas con `canonTecnica()`. Las plantillas viejas con
«Serigrafía» abren como «Serigrafía plana».

**Avisos.** Si el logo es más grande que el área o que lo que imprime la técnica,
o se sale del área, el paso 3 lo avisa (con la medida de cada uno). Con una
rotativa, el área real (por ejemplo, «Área 360° (envuelve el producto): 26,1 ×
12,5 cm») queda escrita en las observaciones del logo de la ficha, para el taller.

**Límites por técnica.** «Límites por técnica» (paso 2) abre la tabla de hasta
cuánto imprime cada técnica, en cm: la carga producción, vacío es sin límite.
Se guarda con confirmación y sin clave, y vale para todos.

### Medidas y áreas guardadas

Si la medida o el área no quedaron bien, se ajustan y se toca **💾 Guardar medida y
área para todos** (paso 2). Pide confirmación («¿Estás seguro?… de acá en adelante
todos los que traigan este producto lo van a ver así») y no pide clave. Desde ahí,
cualquiera que traiga ese producto lo recibe así: la ficha dice quién lo ajustó y
cuándo, la foto queda marcada con 💾, y la medida y el área salen como las dejaron.
A medida que se usa, los productos van quedando perfectos.

Con una técnica elegida, **el área se guarda para esa técnica** (el botón lo dice:
«Guardar medida y área de Tampografía para todos») y se recuerda en qué foto va:
la próxima vez que alguien elija esa técnica, sale esa foto con esa área. Las
áreas de las otras técnicas no se tocan. **Volver a lo automático** (también con
confirmación) borra, con técnica, solo el área de esa técnica (la medida de la foto
queda); sin técnica, todo lo guardado de esa foto.

Se guarda por raíz del producto (vale para todos sus colores y talles; la medida y
el área, por foto; el área, también por técnica) en la función
`functions/api/medidas.js`, sobre un KV de Cloudflare, igual que la tabla de
límites por técnica. Como no hay clave, la función solo acepta guardados hechos
desde la misma app y lleva un historial de los últimos 30 cambios de cada producto
y de la tabla (quién, cuándo, qué foto y técnica), para ver quién cambió qué si
algo se guardó mal. Prueba: `node test_medidas.mjs`.

**Puesta en marcha (una sola vez, ya hecha):** Cloudflare → Storage & Databases →
KV → *Create namespace* (por ejemplo `formas-medidas`). Después Workers & Pages →
formas-bocetos-con-logo → Settings → Bindings → *Add* → KV namespace, con
**Variable name `MEDIDAS`** y ese namespace, en *Production* **y** en *Preview*, y
redesplegar. Sin eso todo anda igual, pero el botón de guardar avisa que falta.

### De dónde salen los datos: el catálogo de la API de STP

La búsqueda usa **`catalogo-shop.json`**, armado desde la API de catálogo de STP
(`/api/product/67/`, la que hizo Datacrush): los productos activos de formas.shop
con sus fotos (de la tienda y del proveedor), las medidas y las áreas de impresión
ya leídas. No lleva precios, stock ni costos. Se regenera con los tokens de
lectura (nunca van a la web ni al repo):

```
STP_API_TOKEN=… ZECAT_TOKEN=… node herramientas/catalogo-shop.mjs
```

Con `ZECAT_TOKEN` (el de la API de Zecat, `api.zecat.com/v1/generic_product`), los
productos de Zecat (SKU `ZEC_` + el SKU de la variante en Zecat) suman sus áreas:
nombre, medida en cm, foto de ese color, recuadro en la foto (Zecat los da sobre una
grilla de 400 × 400), técnicas con su máximo y si es la principal. Las 1.791
variantes de Zecat del shop las tienen (6.522 áreas). Las 280 cuyo recuadro no
guarda la proporción de sus cm quedan marcadas como «escala dudosa» y el boceteador
lo avisa. Sin `ZECAT_TOKEN` se conservan las áreas del catálogo anterior.

Las técnicas por tipo de producto se leen del **cotizador de Formas**
(`cotizadorformasshop.pages.dev`, su tabla de subfamilias y métodos): cada
producto se cruza por su categoría madre de STP (`base_category`), que coincide
con la subfamilia del cotizador en el 99,7 % (los nombres que difieren apenas, como
«Necesers» y «Neceser», se igualan). Si el cotizador no responde, se conservan las
del catálogo anterior.

Tarda medio minuto, y con Zecat unos minutos más (un pedido por producto). Conviene correrlo cada tanto (el shop suma productos todos
los días) y subir el `catalogo-shop.json` nuevo. Un producto más nuevo que el
catálogo igual se trae por su link o su código: en ese caso se lee su página
pública (`leerFichaShop()`). Las medidas y las áreas se leen con la misma
función, `leerDescripcion()`, en los dos caminos y en el armado del catálogo.

La API no busca por número de producto ni por nombre (solo por `sku` o `root`) y
todavía no trae las áreas de impresión como campo (`print_areas` quedó pendiente
en Datacrush): por eso se leen de la descripción. Cuando la API las traiga, el
lugar a tocar es `herramientas/catalogo-shop.mjs`.

Las fotos pasan por la función `functions/api/shop.js` (`/api/shop?img=`, y
`/api/shop?id=` para la página pública), porque el shop y los proveedores no
dejan que otra web las lea. Solo reenvía los bytes (casi nada de CPU) y solo
responde fichas por número y fotos del shop y de los dominios de los proveedores
que trae la API (Zecat, X-Trade, Promoproductos, Nuevas Formas…): no es un proxy
abierto. Si aparece un proveedor nuevo con fotos en otro dominio, se suma a
`HOSTS_FOTOS`. No necesita variables.

Pruebas: `node test_shop.mjs`, `node test_medir_producto.mjs`, `node test_medidas.mjs` y
`node test_tecnicas.mjs`.

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

## Marca de producción en el pie

Cada hoja lleva, al lado de «Formas Publicitarias», una letra chica en un
círculo de color que le dice a producción con qué dato se armó el boceto (en la
impresión, en el PDF editable y en el `Boceto aprobado.pdf` del paquete):

| Marca | Opción del boceteador | Qué significa |
|---|---|---|
| **L** en círculo rojo | «Tengo la medida exacta del logo» | la medida la anotó el ejecutivo |
| **P** en círculo verde | «Sé la medida del producto» | la medida se calculó con el recuadro del producto sobre la foto: conviene verificarla |

Sin marca: la foto se subió ya lista, sin pasar por el boceteador. Si después
de aplicar el boceto se cambia la foto a mano, la marca se borra de esa hoja.

## Paquete para el taller (.zip)

El botón **"📦 Paquete para el taller (.zip)"** arma lo que se le manda al
proveedor (por mail o WhatsApp) para que imprima sin preguntar nada:

- `Boceto aprobado.pdf`: el mismo boceto que vio el cliente.
- Una carpeta por aplicación (`Hoja N - posición - técnica - medida`) con:
  - **`Arte en curvas - medida real.pdf`**: PDF vectorial del tamaño exacto del
    arte, con los logos ubicados como en el boceto (si van varios juntos, la
    combinación lista para la película o el shablón, con rotaciones incluidas).
  - el **arte a medida real en PNG 300 dpi** (lleva los dpi adentro, así abre al
    tamaño justo en Corel/Illustrator/Photoshop);
  - el mockup y los **archivos originales del cliente** tal cual se subieron,
    más los que se adjuntan con «📎 Adjuntar original del cliente» (EPS, CDR…).
- `LEEME - Ficha tecnica.pdf`: medida, técnica, colores/Pantone, cantidad y
  qué archivo usar para producir cada aplicación.

### Cómo se arma el arte en curvas

- **Original en curvas (PDF, AI con compatibilidad PDF, SVG):** se usan las
  curvas del cliente, sin redibujar. Se recorta el pedazo que se ve en el boceto
  y se escala a la medida. Los colores del archivo (incluidos los Pantone que
  traiga como color directo) quedan como estaban.
- **Logo a un color en el boceto** (negro, grabado, blanco o un color elegido):
  las mismas curvas se repintan a esa tinta. Si el color tiene Pantone, va como
  tinta directa con ese nombre ("PANTONE 485 C"); el negro va como K 100.
- **Logo que es una imagen** (o retocado con IA, o con un color borrado en el
  boceteador): se **vectoriza automáticamente** en el navegador (imagetracerjs).
  Sirve para logos planos; por eso la ventana muestra una vista previa y pide
  confirmar que se revisó.
- En DTF, sublimación e impresión digital manda el PNG: el PDF en curvas solo
  se suma si hay curvas reales del cliente.

Para saber qué pedazo del PDF original corresponde a la imagen del logo, el
paquete repite el cálculo de `regionLogoPdf()` (lo mismo que se hizo al
cargarlo). Si se cambia cómo se rasterizan los PDF, ese cálculo cambia para los
dos. Si algo no coincide, ese logo se vectoriza y se avisa.

### Revisión antes de mandar

Se chequea **según la técnica** (serigrafía y tampografía piden Pantone y curvas,
DTF y digital piden fondo transparente y resolución, láser pide un solo color,
etc.).

- **Lo que falta** (técnica, posición, medida) se marca en rojo, pero **no
  frena**: si el vendedor tilda «Mandarlo igual», el zip sale como
  `INCOMPLETO - …`, las carpetas dicen `SIN POSICION` / `SIN MEDIDA`, y el LEEME
  abre con un recuadro rojo "no producir sin confirmar". Sin medida, el arte va a
  un tamaño de referencia para escalar.
- **Lo dudoso** (logo que es una foto metida en un PDF, textos sin convertir a
  curvas, degradés en técnicas de tinta plana, baja resolución, vectorizado
  automático…) hay que tildarlo como revisado y queda escrito en el LEEME.

### Detalles para no romper

- Los originales y el arte **no van al autoguardado** (localStorage tiene ~5 MB):
  van a IndexedDB (`formas-archivos`) y la hoja sólo guarda el id. Las
  plantillas de Drive sí los llevan adentro, para abrirse en otra computadora.
- El arte de producción no es el mockup: sin la opacidad del boceto, el tinte
  grabado sale como silueta negra limpia y el "negro" de pantalla sale #000.
- Los PDF se rasterizan con fondo transparente: pdf.js pinta la hoja de blanco
  por defecto y el logo quedaba con un recuadro blanco.
- JSZip, pdf-lib, imagetracerjs y svg2pdf.js se cargan recién al usarlos (con un
  CDN de respaldo). Los nombres dentro del zip van sin tildes porque los
  descompresores viejos de Windows los rompen.

## Ramas y entornos de prueba

Cloudflare Pages publica **cada rama en su propia URL** (preview deployments),
con la misma función de IA. Las variables de Cloudflare van por separado para
*Production* y *Preview*: cargadas en las dos, la IA funciona igual en todas:

| Rama | Para qué | URL |
|---|---|---|
| `main` | **Producción.** Solo recibe merges desde `dev` ya validados | https://formas-bocetos-con-logo.pages.dev |
| `dev` | Preproducción: acá se junta y se prueba lo que va a salir | https://dev.formas-bocetos-con-logo.pages.dev |
| `jp-code` | Arenero de Juan Pedro: pruebas jugadas, sin compromiso | https://jp-code.formas-bocetos-con-logo.pages.dev |

El flujo: se trabaja en `jp-code` (o en ramas propias), lo que sobrevive se
mergea a `dev`, se valida en la URL de `dev`, y recién entonces `dev` se
mergea a `main`. **Nada sube solo de una rama a la otra.** Cada push a una
rama actualiza su URL en segundos (cualquier rama nueva también tiene la suya,
`<rama>.formas-bocetos-con-logo.pages.dev`), y si se usan pull requests
Cloudflare comenta en el PR la URL para revisarlo antes de mergear.

## App publicada

**https://formas-bocetos-con-logo.pages.dev/** (Cloudflare Pages, conectado a
este repo). `index.html` redirige al generador. Cada push a `main` se publica
solo, sin build. Netlify no publica más: en la dirección vieja
(`formas-bocetos-con-logo.netlify.app`) muestra `mudanza.html`, que redirige acá y, si el
navegador tenía plantillas 💾 o un boceto en curso guardados allá, ofrece un botón para
traerlos (el navegador guarda esos datos por dirección). La otra mitad está en
`generador-bocetos.html`, «Mudanza desde Netlify». Las dos se pueden borrar cuando ya
nadie entre por la dirección vieja.

## Mejorar la foto con IA (OpenAI)

En el generador, debajo de "Foto del producto", hay dos botones que mandan la
foto a la IA de OpenAI y devuelven una versión mejorada para comparar
antes/después y decidir si se usa:

- **✨ Fondo blanco** — recorta el producto y lo presenta estilo e-commerce:
  fondo blanco puro, centrado, sombra de contacto suave.
- **✨ En situación** — muestra el producto en una escena de uso real (oficina,
  evento, cafetería…), nítido en primer plano con el fondo desenfocado.
- **✨ Más resolución** — agranda una foto chica manteniendo el producto, el
  encuadre, los colores y la luz exactamente iguales (conserva la proporción de
  la foto original). Si la foto cargada tiene menos de 1000 px de lado, la ficha
  lo avisa debajo de los botones; en el boceteador aparece un diálogo con tres
  salidas: cambiar la foto, mantenerla o mejorarla con IA (con «Volver a la
  original» después).

El "estilo Formas" (reglas de marca: no tocar el producto ni su logo, look
luminoso y profesional, sin texto agregado) vive en el servidor, en
`functions/api/ia-imagen.js`, junto con el prompt de cada modo. Para
ajustar el estilo se edita ese archivo, no el HTML.

**Cómo funciona por dentro:** el navegador nunca ve la API key. Le pega a la
función (`/api/ia-imagen`) con una clave compartida (header `x-formas-clave`,
se pide una sola vez y queda en el navegador); la función crea el trabajo en la
Responses API de OpenAI en modo *background* y el navegador consulta el estado
cada 4 segundos, así que ninguna llamada queda esperando aunque la imagen tarde
minutos. La foto y la imagen generada pasan por la función sin convertirse a
texto: el plan gratis de Cloudflare corta a los 10 ms de CPU por llamada (ver
el comentario `ponytail:` en el archivo). Prueba: `node test_ia_imagen.mjs`.

**Puesta en marcha** (Cloudflare → Workers & Pages → formas-bocetos-con-logo →
Settings → Variables and Secrets, en *Production* y en *Preview*):

| Variable | Qué es |
|---|---|
| `OPENAI_API_KEY` | Obligatoria. Key de https://platform.openai.com |
| `FORMAS_IA_CLAVE` | Obligatoria. Clave compartida que la app le pide al usuario |
| `OPENAI_MODEL` | Opcional. Modelo conductor (default `gpt-5-mini`) |
| `OPENAI_IMAGE_MODEL` | Opcional. Modelo de imagen (default `gpt-image-2.5-sunburst`) |
| `OPENAI_IMAGE_QUALITY` | Opcional. `low` / `medium` / `high` / `xhigh` / `max` (default `medium`) |

Las imágenes las genera **GPT Image 2.5**, en su variante `sunburst`: es la de
mayor precisión al editar, la que mejor conserva el producto y el logo tal cual
son. Tarda más que la alternativa rápida, y esa es la decisión tomada acá — en
un boceto que se le muestra al cliente, la fidelidad vale más que unos segundos.
Si en algún momento se prefiere velocidad, se cambia `OPENAI_IMAGE_MODEL` a
`gpt-image-2.5-flare` y se redespliega, sin tocar código.

Después de setearlas hay que redesplegar el sitio (Deployments → el último →
Retry deployment). Costo orientativo: unos centavos de dólar por imagen en
calidad media. Para probar en local: `npx wrangler pages dev .` (levanta la app
con la función incluida; las variables van en un archivo `.dev.vars`).

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

### Modificar logo con IA

En el paso 3 del boceteador (para el logo seleccionado) y debajo de "Logo del
cliente" en la ficha (para el logo de la hoja) está **✨ Modificar logo con IA**:
se abre un modal con el logo, se escribe qué cambiarle («sacale el slogan»,
«pasalo a un solo color», «redibujalo prolijo»…) y la IA devuelve una versión
para comparar con la actual. «↻ Seguir editando este» encadena otro pedido sobre
el resultado; «Usar este logo» lo reemplaza manteniendo posición, ancho y color
de impresión, y en el boceteador queda «Volver al original». El logo viaja en
PNG (con su transparencia) y vuelve sin fondo; las reglas de cómo se edita un
logo (cambiar solo lo pedido, gráfico plano para imprimir) están en
`ESTILO_LOGO`, en la misma función.

### Si la IA no anda

Cuando algo falla, el mensaje debajo del botón dice el motivo real. Los más
comunes y qué hacer:

| Mensaje | Qué hacer |
|---|---|
| «La IA no está configurada: faltan OPENAI_API_KEY y/o FORMAS_IA_CLAVE…» | Cargar las variables en Cloudflare (en *Production* **y** en *Preview*) y redesplegar |
| «Clave incorrecta» | La clave que se tipeó no coincide con `FORMAS_IA_CLAVE`: tocar el botón de nuevo y escribirla bien |
| «OpenAI rechazó el pedido (401)…» | La `OPENAI_API_KEY` es inválida o se revocó |
| «OpenAI rechazó el pedido (403): …organization must be verified…» | Verificar la organización en platform.openai.com → Settings → Organization (los modelos de imagen lo exigen) |
| «OpenAI rechazó el pedido (429)…» | Sin crédito o límite de uso: revisar Billing en platform.openai.com |
| «Esta dirección no tiene la función de IA» | Se está usando otra dirección (la vieja de Netlify o el archivo local): entrar por formas-bocetos-con-logo.pages.dev |
| «El servidor de la IA falló (error 5xx)» | Error de Cloudflare: si se repite, revisar los logs de la función en Cloudflare |

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
   exactamente: `https://formas-bocetos-con-logo.pages.dev` → Crear.
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
