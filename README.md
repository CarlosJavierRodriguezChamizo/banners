# Banners Generator

> **Extra**: en `landing/index.html` hay una landing page de demo para un producto financiero Gen Z ("blu"), inspirada en el look & feel de BBVA y Trade Republic. Es un HTML autocontenido: ábrelo directamente en el navegador (usa las fuentes Sora de `fonts/`).

App local para generar banners en los 14 formatos requeridos para Decorabaño, Todo Muebles de Baño, Solomamparas, Decora Salle de Bain y Douche Elite.

## Requisitos

- Node.js 18+
- ~250 MB libres (Puppeteer descarga su propia versión de Chromium en `npm install`)

## Instalación

```bash
cd /Users/carlosjavierrodriguezchamizo/Desktop/DEV/banners
npm install
```

## Tipografías

Los `@font-face` (en `src/templates/shared.js` → `fontFaceCss`) ya están configurados para los archivos `.ttf` que has colocado en `fonts/`:

```
fonts/
├── lausanne/         → Lausanne-300/400/500/700/800 + italics  (Decorabaño, Decora Salle de Bain)
├── sora/             → Sora-Thin/Light/Regular/Medium/SemiBold/Bold/ExtraBold  (Solomamparas, Douche Elite)
├── ogg/              → Ogg-Roman, Ogg-Italic  (Todo Muebles — títulos)
└── suisse-intl/      → SuisseIntl-Thin/Book/Regular/SemiBold/Bold + italics  (Todo Muebles — body)
```

Si añades pesos nuevos o renombras archivos, edita `src/templates/shared.js`. Si falta un peso concreto, el navegador eligirá automáticamente el más cercano de la familia.

## Arranque

```bash
npm start
```

Luego abre [http://localhost:3000](http://localhost:3000).

En WebStorm puedes configurarlo como una "npm" run configuration con script `start`.

## Uso

1. **Marca**: selecciona la tienda. Cada una usa su plantilla visual fija y sus tipografías.
2. **Copy**: introduce titular, subtítulo (opcional) y CTA. En Solomamparas/Douche Elite cada salto de línea del titular genera una "tag" azul independiente.
3. **Imagen**: sube el JPG/PNG que se usará en los 14 banners.
4. **Por formato**: cada tarjeta muestra una previa fiel del resultado. Haz click sobre la previa para fijar el punto focal de la imagen para ese formato (un círculo azul marca la posición). Activa el toggle "Velo" si necesitas oscurecer la imagen para que el texto se lea.
5. **Generar ZIP**: el servidor renderiza los 14 banners con Puppeteer (~30 s) y descarga un ZIP con esta estructura:

```
banners-<marca>-<timestamp>.zip
├── google/
│   ├── 1200x628.jpg
│   ├── 1200x1200.jpg
│   └── 960x1200.jpg
├── facebook/
│   ├── 1640x856.jpg
│   └── 1200x630.jpg
├── instagram/
│   ├── 1200x630.jpg
│   ├── 1080x1920.jpg
│   ├── 1080x1350.jpg
│   └── 1080x1080.jpg
├── pinterest/
│   ├── 1000x1500.jpg
│   └── 800x450.jpg
├── twitter/
│   ├── 1500x500.jpg
│   └── 1024x512.jpg
└── email/
    └── 1200x1200.jpg
```

## Personalización de marcas

Los colores y pesos de fuente por marca están en `src/brands.js`. Edita ahí si necesitas afinar (por ejemplo el color exacto del azul de Solomamparas o el navy de Decorabaño).

Las 3 plantillas visuales viven en `src/templates/`:
- `panel.js` → Decorabaño, Decora Salle de Bain
- `tags.js` → Solomamparas, Douche Elite
- `editorial.js` → Todo Muebles de Baño

Cada plantilla adapta su layout según la categoría del formato (`wide`, `square`, `portrait`) — definida en `src/templates/shared.js`.

## Notas

- Los uploads quedan en `uploads/` (se acumulan; puedes limpiar la carpeta cuando quieras).
- El renderer usa `deviceScaleFactor: 2` y luego baja con sharp → texto más nítido en el JPG final.
- Calidad JPG por defecto: 92 (modificable en `src/renderer.js`).
- Si Puppeteer no se descarga Chromium en `npm install`, ejecuta `npx puppeteer browsers install chrome`.
