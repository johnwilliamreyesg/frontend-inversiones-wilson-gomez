# Frontend — Sistema de créditos y cobranza

Aplicación web (pensada primero para el celular) del sistema de créditos y cobranza de Inversiones Wilson Gómez. Consume la API del repositorio `backend-inversiones-wilson-gomez`.

## Tecnologías

| Para qué | Librería |
|---|---|
| Interfaz | React 19 + Vite 6 (JavaScript) |
| Rutas | React Router 7 |
| Datos del servidor (caché, cargando, reintentos) | TanStack Query 5 |
| Formularios y validación | React Hook Form + Zod 4 (la misma librería de validación del backend) |
| Estilos | Tailwind CSS 4 |
| Íconos | lucide-react |
| Pruebas | `node:test` (el corredor de pruebas de Node, igual que el backend) |

## Cómo correrlo

Requisitos: Node 20+ y el backend corriendo (por defecto en `http://localhost:3000`).

```bash
npm install
cp .env.example .env   # opcional en desarrollo
npm run dev            # http://localhost:5173
```

En desarrollo, Vite reenvía las peticiones `/api` al backend (`vite.config.js`), así que no hay que configurar CORS. Para usarlo desde el celular en la misma red Wi-Fi: `npm run dev -- --host` y abrir `http://<ip-del-computador>:5173`.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` para revisarla |
| `npm test` | Pruebas unitarias (`tests/`) |

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL de la API vista desde el navegador. Desarrollo: `/api`. Producción: la URL pública del backend, p. ej. `https://api.midominio.com/api` (recuerde agregar el dominio del frontend en `CORS_ORIGINS` del backend). |
| `DEV_API_PROXY_TARGET` | Solo desarrollo: a dónde reenvía Vite `/api` (por defecto `http://localhost:3000`). |

## Estructura

```
src/
├── main.jsx                 ← punto de entrada
├── index.css                ← Tailwind + colores de la marca (tokens)
├── app/                     ← App (proveedores) y router (todas las rutas)
├── config/env.js            ← única lectura de variables de entorno
├── api/                     ← capa de datos: un módulo por recurso de la API
│   ├── http-client.js       ← fetch + token + errores (los módulos dependen de esta clase)
│   ├── api-error.js         ← error único con mensaje y errores por campo
│   └── index.js             ← "composition root": crea el cliente HTTP y los módulos
├── auth/                    ← sesión (AuthProvider), guardas de rutas y permisos
├── components/
│   ├── layout/              ← menú lateral (PC), barra inferior y cajón "Más" (celular)
│   └── ui/                  ← botones, campos, tarjetas, diálogos, listas…
├── features/                ← una carpeta por módulo de negocio
│   ├── auth/  dashboard/  clients/  loans/  collections/
│   ├── payments/  expenses/  reports/  users/  interest-rates/
│   │   ├── *Page.jsx        ← pantallas
│   │   ├── *.queries.js     ← lecturas y escrituras a la API (TanStack Query)
│   │   └── *.js             ← reglas puras (validación, cálculos) con pruebas
├── hooks/                   ← hooks reutilizables (filtros en la URL, debounce)
└── utils/                   ← formato de dinero/fechas, etiquetas en español
```

## Convenciones

- **Código en inglés, textos de pantalla en español.** Los textos que vienen de la API (`code`) se traducen en `utils/labels.js`.
- **Las pantallas no llaman a `fetch`.** Página → hook de `*.queries.js` → módulo de `api/` → `HttpClient`. Cambiar cómo se habla con el servidor no toca las pantallas.
- **Permisos:** `can('loans.create')` oculta botones y entradas de menú; las rutas usan `RequirePermission`. La API vuelve a validar cada permiso, así que ocultar es comodidad, no seguridad.
- **Errores de formulario:** la validación local usa las mismas reglas del backend; si aun así la API rechaza un campo (400 o 409), el mensaje aparece debajo de ese campo (`utils/form-errors.js`).
- **Fechas:** se trabajan como texto `AAAA-MM-DD` y "hoy" es la fecha de Colombia (`utils/dates.js`), igual que en el backend.
- **Dinero:** se escribe con puntos de miles (`1.250.000`) y se envía como número; las sumas se hacen en centavos enteros.
