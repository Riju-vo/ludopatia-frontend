# Frontend

Frontend separado del backend del predictor del Mundial 2026.

## Stack

- React
- Vite
- TypeScript

## Variables de entorno

Crear `.env` a partir de `.env.example`:

```powershell
Copy-Item .env.example .env
```

Variable principal:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Comandos

```powershell
npm install
npm run dev
```

## Objetivo de esta carpeta

- Mantener el front aislado del backend Python
- Consumir la API ya creada en `/matches`, `/groups`, `/teams` y `/models`
- Preparar una UI más seria para partidos del día, grupos y detalle de predicción

## Railway

El frontend esta preparado para desplegarse como servicio independiente en
Railway con [`railway.json`](railway.json).

Variable principal para produccion:

```env
VITE_API_BASE_URL=https://<tu-backend>.up.railway.app
```

Notas:

- El build genera `dist/` con Vite.
- Railway sirve la SPA con `vite preview` sobre `$PORT`.
- Si cambia la URL publica del backend, actualiza `VITE_API_BASE_URL` y vuelve
  a desplegar.
