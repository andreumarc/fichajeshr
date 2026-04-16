# Guía de Despliegue — Fichaje SaaS

Stack de producción:
- **Base de datos**: Supabase (PostgreSQL gestionado)
- **App completa (frontend + API)**: Vercel (Next.js con API Routes)
- **Código fuente**: GitHub

> ✅ No se necesita Railway ni ningún servidor externo.
> El backend NestJS ha sido migrado a Next.js API Routes que corren en Vercel.

---

## Paso 1 — GitHub

```bash
# En la raíz del proyecto (si aún no tienes remoto)
git remote add origin https://github.com/TU_USUARIO/fichaje-saas.git
git push -u origin main
```

---

## Paso 2 — Supabase (Base de datos)

1. Entra en [supabase.com](https://supabase.com) → **New project**
2. Elige región (recomendado: EU West)
3. Ve a **Project Settings → Database → Connection string**
4. Copia las dos URLs:
   - **Transaction pooler** (puerto 6543) → para `DATABASE_URL`
   - **Direct connection** (puerto 5432) → para `DIRECT_URL`

> ⚠️ Añade `?pgbouncer=true&connection_limit=1` al Transaction pooler URL

---

## Paso 3 — Vercel (Frontend + API)

1. Entra en [vercel.com](https://vercel.com) → **Add New Project → Import Git Repository**
2. Selecciona el repo
3. **Root Directory**: `apps/web`
4. **Framework**: Next.js (detección automática)
5. **Build Command**: `prisma generate && next build` ← ya está en vercel.json
6. Ve a **Environment Variables** y añade:

```
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.[REF]:[PASS]@db.[REF].supabase.co:5432/postgres
JWT_SECRET=<genera: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<otro valor diferente>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://TU-APP.vercel.app
NEXT_PUBLIC_API_URL=https://TU-APP.vercel.app/api/v1
NEXT_PUBLIC_KIOSK_URL=https://TU-APP.vercel.app/kiosk
BCRYPT_ROUNDS=12
PIN_HASH_SECRET=<valor aleatorio>
SUPERADMIN_EMAIL=superadmin@fichaje.app
SUPERADMIN_PASSWORD=<contraseña fuerte>
```

7. Click **Deploy**

---

## Paso 4 — Migraciones de base de datos

Tras el primer deploy, ejecuta las migraciones desde local apuntando a Supabase:

```bash
cd apps/web
DATABASE_URL="tu-direct-url-de-supabase" DIRECT_URL="tu-direct-url-de-supabase" npx prisma migrate deploy
```

O desde el terminal de Vercel (Functions → Open Console).

### Seed inicial (datos de prueba)

```bash
cd apps/backend
DATABASE_URL="tu-direct-url-de-supabase" DIRECT_URL="tu-direct-url-de-supabase" npx ts-node src/seed/seed.ts
```

Credenciales por defecto:
- Superadmin: `superadmin@fichaje.app` / `SuperAdmin123!`
- Admin empresa: `admin@techcorp.es` / `Admin123!`

---

## Despliegues continuos (CI/CD)

Cada `git push` a `main` → Vercel redespliega automáticamente ✅

---

## Variables de entorno — resumen

| Variable | Dónde configurar | Descripción |
|---|---|---|
| `DATABASE_URL` | Vercel | Supabase pooler (puerto 6543) |
| `DIRECT_URL` | Vercel | Supabase directo (puerto 5432) para migraciones |
| `JWT_SECRET` | Vercel | Secreto JWT access token (64 chars hex) |
| `JWT_REFRESH_SECRET` | Vercel | Secreto JWT refresh token |
| `NODE_ENV` | Vercel | `production` |
| `NEXT_PUBLIC_API_URL` | Vercel | URL del frontend + /api/v1 |
| `NEXT_PUBLIC_APP_URL` | Vercel | URL del frontend |

---

## Dominio personalizado

**Vercel**: Project → Domains → Add `fichaje.tudominio.com`
Actualiza `NEXT_PUBLIC_APP_URL` con el dominio real.
