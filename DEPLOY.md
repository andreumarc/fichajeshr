# Guía de Despliegue — Fichaje SaaS

Stack de producción:
- **Base de datos**: Supabase (PostgreSQL gestionado)
- **Backend API**: Railway (NestJS)
- **Frontend**: Vercel (Next.js)
- **Código fuente**: GitHub

---

## Paso 1 — GitHub

```bash
# En la raíz del proyecto
git init
git add .
git commit -m "feat: initial commit"

# Crea un repositorio en github.com y luego:
git remote add origin https://github.com/TU_USUARIO/fichaje-saas.git
git branch -M main
git push -u origin main
```

---

## Paso 2 — Supabase (Base de datos)

1. Entra en [supabase.com](https://supabase.com) → **New project**
2. Elige región (ej: EU West)
3. Una vez creado, ve a **Project Settings → Database**
4. Copia las dos URLs de conexión:
   - **Transaction pooler** (puerto 6543) → para `DATABASE_URL` en Railway
   - **Direct connection** (puerto 5432) → para `DIRECT_URL` en Railway

> ⚠️ Añade `?pgbouncer=true&connection_limit=1` al final de `DATABASE_URL`

---

## Paso 3 — Railway (Backend NestJS)

1. Entra en [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Selecciona el repo → elige `apps/backend` como **Root Directory**
3. Railway detectará el `railway.json` automáticamente
4. Ve a la pestaña **Variables** y añade:

```
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.[REF]:[PASS]@db.[REF].supabase.co:5432/postgres
JWT_SECRET=<genera con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<otro valor aleatorio diferente>
NODE_ENV=production
CORS_ORIGINS=https://TU-APP.vercel.app
SUPERADMIN_EMAIL=superadmin@fichaje.app
SUPERADMIN_PASSWORD=<contraseña fuerte>
BCRYPT_ROUNDS=12
PIN_HASH_SECRET=<valor aleatorio>
```

5. **Deploy** → Railway ejecutará automáticamente:
   - `npm install`
   - `npx prisma generate`
   - `npx @nestjs/cli build`
   - Al arrancar: `npx prisma migrate deploy && node dist/main`

6. Copia la URL pública del backend (ej: `https://fichaje-backend.up.railway.app`)

> **Seed inicial**: Tras el primer deploy, ejecuta desde Railway el comando:
> ```bash
> npx ts-node src/seed/seed.ts
> ```
> O hazlo desde local apuntando a la DB de Supabase.

---

## Paso 4 — Vercel (Frontend Next.js)

1. Entra en [vercel.com](https://vercel.com) → **Add New Project → Import Git Repository**
2. Selecciona el repo → **Root Directory**: `apps/web`
3. Framework: **Next.js** (detección automática)
4. Ve a **Environment Variables** y añade:

```
BACKEND_URL=https://fichaje-backend.up.railway.app
NEXT_PUBLIC_API_URL=https://TU-APP.vercel.app/api/v1
NEXT_PUBLIC_APP_URL=https://TU-APP.vercel.app
NEXT_PUBLIC_KIOSK_URL=https://TU-APP.vercel.app/kiosk
```

5. **Deploy** → Vercel construirá y desplegará el frontend

> El frontend proxea todas las llamadas `/api/v1/*` al backend de Railway,
> por lo que el navegador sólo necesita conocer la URL de Vercel.

---

## Paso 5 — CORS (actualizar Railway)

Una vez tengas la URL de Vercel, actualiza en Railway:
```
CORS_ORIGINS=https://TU-APP.vercel.app
```

---

## Despliegues continuos (CI/CD)

Con esta configuración, cada `git push` a `main`:
- **Railway** redespliega el backend automáticamente
- **Vercel** redespliega el frontend automáticamente

---

## Variables de entorno — resumen

| Variable | Dónde | Descripción |
|---|---|---|
| `DATABASE_URL` | Railway | Supabase pooler (6543) |
| `DIRECT_URL` | Railway | Supabase directo (5432) para migraciones |
| `JWT_SECRET` | Railway | Secreto JWT (64 chars hex) |
| `JWT_REFRESH_SECRET` | Railway | Secreto JWT refresh |
| `CORS_ORIGINS` | Railway | URL de Vercel |
| `NODE_ENV` | Railway | `production` |
| `BACKEND_URL` | Vercel | URL del backend de Railway |
| `NEXT_PUBLIC_API_URL` | Vercel | URL del frontend + /api/v1 |
| `NEXT_PUBLIC_APP_URL` | Vercel | URL del frontend |

---

## Dominio personalizado

- **Vercel**: Project → Domains → Add `fichaje.tudominio.com`
- **Railway**: Settings → Networking → Custom Domain `api.tudominio.com`
- Actualiza `CORS_ORIGINS` y `NEXT_PUBLIC_*` con los dominios reales
