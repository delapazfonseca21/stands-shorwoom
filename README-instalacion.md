# Stand Showroom 3D

Carrusel 3D ligero de stands comerciales (three.js, sin recorrido virtual, sin GLB, sin iframe) para insertar en WordPress/Elementor de forma invisible.

## Probar rápido

- **Sin servidor, sin WordPress**: abre `index.html` con doble click — todo inline (three.js + módulos + CSS + logos embebidos) en un solo archivo, funciona en `file://`. Pantalla completa.
- **Con servidor local** (Live Preview / Live Server de tu editor, o `python -m http.server 8080` en la carpeta): abre `http://localhost:8080/demo.html` — sirve los archivos modulares reales, idénticos a producción. Pantalla completa.

## Desplegar en GitHub Pages

`index.html` es 100% autocontenido, ideal para Pages:

1. Sube el **contenido** de `stands-showroom/` a la **raíz del repo** (no la carpeta, su contenido: `index.html`, `demo.html`, `js/`, `css/`, `assets/`, `stands-showroom.php`, `.gitignore`, etc.).
2. Repo → Settings → Pages → Source: rama `main` / carpeta raíz (`/`).
3. Visita `https://usuario.github.io/repo/` → Pages sirve `index.html` automáticamente.

La carpeta `stands/` (imágenes de referencia) no se necesita para el deploy; el logo Pintuco ya vive en `assets/logos/`.

## Qué hace

- 12 stands en un círculo de 360°. La cámara está fija al centro: todos los stands quedan a la misma distancia.
- FOV limitado por construcción: sin zoom, sin pan, sin desplazamiento libre.
- Navegación: arrastre horizontal, flechas ‹ › de los costados, tecla ← →.
- Snap automático de 30° con easing al soltar el arrastre.
- Chevron animado + logo + nombre SOLO sobre el stand al que apunta la vista.
- Logos de las empresas como decals sobre la pared trasera de cada stand.
- El render solo corre cuando hay movimiento (drag, snap, parallax del cursor).

## Estructura

```
stands-showroom/
├── stands-showroom.php        Plugin mini para WordPress (shortcode) — en la raíz
├── index.html                 Versión standalone (doble click o GitHub Pages raíz)
├── demo.html                  Prueba con servidor local (archivos modulares reales)
├── build-standalone.mjs       Regenera index.html (node build-standalone.mjs)
├── css/stands-showroom.css    Estilos prefixed .stshow (scoped, hereda la tipografía del tema)
├── assets/logos/              Logos locales de las empresas (p. ej. logo-pintuco.jpg)
├── js/
│   ├── app.js                 Bootstrap + render bajo demanda + fallback
│   ├── carousel.js            Cámara fija, drag, inercia, snap de 30°
│   ├── badges.js              Flechas + logos HTML proyectados 3D→pantalla
│   ├── stands.js              Los 3 modelos de stand con primitivas A/B/C
│   ├── materials.js           Paleta, conos de luz, sombras, environment
│   ├── companies-data.js      ★ CONFIGURACIÓN DE LAS 12 EMPRESAS (editable)
│   └── lib/
│       ├── three.module.min.js   Three.js r170 (auto-hospedado)
│       └── RoomEnvironment.js
```

## Instalación en WordPress

1. Copia **la carpeta completa** `stands-showroom` a `wp-content/plugins/` y activa "Stands Showroom 3D" en el panel de plugins.
2. En Elementor, añade un widget **HTML** pegando:

### Paso 2-A — Con el plugin activo

```
[stands_showroom height="70vh" title="Stands Comerciales"]
```

### Paso 2-B — Sin plugin (widget HTML con rutas)

```html
<link rel="stylesheet" href="/wp-content/uploads/stands-showroom/css/stands-showroom.css">
<div class="stshow" data-stshow data-height="70vh" data-title="Stands Comerciales"></div>
<script src="/wp-content/uploads/stands-showroom/js/companies-data.js"></script>
<script type="module" src="/wp-content/uploads/stands-showroom/js/app.js"></script>
```

En ambos casos: se monta solo cuando la sección entra en viewport, **sin ningún click**, no hay iframe, y toma la tipografía y colores base del sitio.

## Configurar las empresas

Edita `js/companies-data.js`:

```js
window.StShowData = {
  companies: [
    { name: 'XYZ Corp', logo: '/wp-content/uploads/2026/01/xyz-logo.png' },
    { name: 'Otra',   logo: 'https://tusitio.com/logo.svg' },
    // ... 12 en total
  ]
};
```

- `logo`: RUTA a un PNG/SVG transparente. Si lo dejas `'PLACEHOLDER'` (o vacío) se genera un chip con iniciales en canvas. Ejemplo local: `'assets/logos/logo-pintuco.jpg'` (la empresa 1 ya va así).
- Los logos se ajustan automáticamente al aspecto dentro de la pared, tamaño máximo por modelo.
- El orden en el array = posición en el círculo (12 en total; si faltan se rellenan con placeholders).
- En `index.html` los logos de `assets/logos/` se embeben en base64 automáticamente al regenerar con `node build-standalone.mjs` (por CORS de `file://`).

## Personalización rápida

| Qué | Dónde |
|---|---|
| Altura de la sección | `data-height="70vh"` en el div / att `height` del shortcode |
| Modelo por empresa (A, B, C alternan) | `MODEL_ORDER` en `js/app.js` |
| Campo de visión | Constantes en `resize()` de `app.js` (50–92 según aspecto) |
| Radio / distancia / snap | `RADIUS` y `STEP_COUNT` en `app.js`, `Carousel` en `carousel.js` |
| Colores y materiales | `PALETTE` en `js/materials.js` |
| Velocidad y sensibilidad del drag | `0.0022` en `dragMove()` |

## Detalles técnicos

- Extendido con three.js r170 (ESM, auto-hospedado, sin CDN externo, cero import maps).
- Ambiente PMREM generado 1 vez al iniciar; sin shadow maps, sombras con gradientes en canvas y conos de luz por textura.
- Badges = botones reales accesibles (`aria-label`, foco actual comunicados); `prefers-reduced-motion` apaga animaciones y parallax.
- Fallback: sin WebGL muestra una retícula de logos con CSS puro.
- Micro-tween propio (~40 líneas): no requiere GSAP ni dependencias extra.
