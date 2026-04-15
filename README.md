# Fichaje SaaS — Plataforma de Control Horario

Plataforma profesional de fichaje laboral con geolocalización, multiempresa, modo kiosco y panel de administración.

---

## Estructura del monorepo

```
fichaje-saas/
├── apps/
│   ├── backend/          # NestJS API REST
│   │   ├── src/
│   │   │   ├── auth/           # JWT + refresh tokens + RBAC
│   │   │   ├── employees/      # Gestión de empleados + QR + PIN
│   │   │   ├── work-centers/   # Centros de trabajo + geofences
│   │   │   ├── time-entries/   # Fichajes (entrada/salida/pausa)
│   │   │   ├── kiosk/          # Modo terminal compartido
│   │   │   ├── reports/        # Dashboard + Excel export
│   │   │   ├── audit/          # Auditoría completa
│   │   │   ├── geofence/       # Lógica Haversine GPS
│   │   │   ├── companies/      # Multitenancy
│   │   │   └── seed/           # Datos de ejemplo
│   │   └── prisma/
│   │       └── schema.prisma   # Schema completo
│   │
│   ├── web/              # Next.js 14 App Router
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/login/       # Login
│   │       │   ├── (employee)/         # Portal empleado
│   │       │   ├── (kiosk)/kiosk/      # Modo kiosco PWA
│   │       │   └── (admin)/            # Panel administración
│   │       ├── components/
│   │       │   ├── clock-in/           # Botones de fichaje
│   │       │   └── kiosk/              # Terminal kiosco
│   │       ├── hooks/useGeolocation.ts
│   │       └── lib/api.ts              # Axios + auto-refresh
│   │
│   └── mobile/           # React Native Expo
│       ├── app/
│       │   ├── (auth)/login.tsx        # Login nativo
│       │   └── (tabs)/                 # Tabs principales
│       ├── services/
│       │   ├── api.ts                  # Axios + SecureStore
│       │   └── offline.ts              # Cola offline
│       └── hooks/useGeolocation.ts     # expo-location
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

---

## Roles y permisos

| Rol           | Acceso                                                         |
|---------------|----------------------------------------------------------------|
| SUPERADMIN    | Todo. Gestión multiempresa.                                    |
| COMPANY_ADMIN | Configuración completa de su empresa.                          |
| HR            | Fichajes, incidencias, empleados, exportaciones.               |
| MANAGER       | Ver equipo asignado y sus fichajes.                            |
| EMPLOYEE      | Solo fichar y ver su historial personal.                       |
| KIOSK         | Solo modo terminal. Sin acceso a datos privados.               |

---

## API REST — Endpoints principales

### Auth
```
POST   /api/v1/auth/login          → Login usuario
POST   /api/v1/auth/refresh        → Renovar token
POST   /api/v1/auth/logout         → Cerrar sesión
GET    /api/v1/auth/me             → Usuario actual
```

### Time Entries (Fichajes)
```
POST   /api/v1/time-entries/clock-in     → Fichar entrada
POST   /api/v1/time-entries/clock-out    → Fichar salida
POST   /api/v1/time-entries/break-start  → Iniciar pausa
POST   /api/v1/time-entries/break-end    → Fin de pausa
POST   /api/v1/time-entries/incident     → Registrar incidencia
GET    /api/v1/time-entries/status       → Estado actual
GET    /api/v1/time-entries/my-history   → Historial personal
GET    /api/v1/time-entries/daily-summary → Resumen del día
GET    /api/v1/time-entries              → Admin: todos los fichajes
PATCH  /api/v1/time-entries/:id/manual-edit → Edición manual con auditoría
```

### Kiosk (sin auth, con X-Company-Id header)
```
POST   /api/v1/kiosk/identify      → Identificar empleado (PIN/código/QR)
POST   /api/v1/kiosk/clock         → Registrar fichaje
GET    /api/v1/kiosk/employees     → Lista empleados del kiosco
```

### Employees
```
GET    /api/v1/employees           → Listar empleados
POST   /api/v1/employees           → Crear empleado
PATCH  /api/v1/employees/:id       → Actualizar
DELETE /api/v1/employees/:id       → Baja lógica
POST   /api/v1/employees/:id/reset-pin    → Resetear PIN
POST   /api/v1/employees/:id/generate-qr  → Generar QR
GET    /api/v1/employees/today-status     → Estado hoy
```

### Reports
```
GET    /api/v1/reports/dashboard         → KPIs principales
GET    /api/v1/reports/monthly-summary   → Resumen mensual
GET    /api/v1/reports/incidents         → Incidencias
GET    /api/v1/reports/export-excel      → Exportar Excel
```

---

## Arranque local (desarrollo)

### Requisitos previos
- Node.js >= 20
- Docker y Docker Compose
- npm >= 10

### 1. Clonar y configurar entorno

```bash
cd fichaje-saas
cp .env.example .env
# Edita .env con tus valores (JWT_SECRET obligatorio)
```

### 2. Arrancar base de datos

```bash
docker-compose up postgres -d
```

### 3. Backend

```bash
cd apps/backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed       # Carga datos de ejemplo
npm run dev           # → http://localhost:4000
```

### 4. Frontend Web

```bash
cd apps/web
npm install
npm run dev           # → http://localhost:3000
```

### 5. App móvil

```bash
cd apps/mobile
npm install
npx expo start        # Abre en iOS/Android/Emulator
```

### Credenciales de prueba (tras seed)

| Usuario            | Contraseña  | Rol           | PIN  |
|--------------------|-------------|---------------|------|
| superadmin@fichaje.app | SuperAdmin123! | SUPERADMIN | -    |
| admin@techcorp.es  | Admin123!   | COMPANY_ADMIN | -    |
| rrhh@techcorp.es   | Admin123!   | HR            | -    |
| ana.garcia@techcorp.es | Admin123! | EMPLOYEE     | 1234 |
| carlos.martinez@techcorp.es | Admin123! | EMPLOYEE | 5678 |
| maria.fernandez@techcorp.es | Admin123! | EMPLOYEE | 9012 |

### Modo kiosco (local)

Abre: `http://localhost:3000/kiosk?company=<company_id>`

El `company_id` lo encuentras en Prisma Studio o en la respuesta del login de admin.

Swagger API docs: `http://localhost:4000/api/v1/docs`

---

## Arranque completo con Docker

```bash
cp .env.example .env
# Edita JWT_SECRET y JWT_REFRESH_SECRET

docker-compose up --build -d

# Ejecutar migraciones y seed
docker exec fichaje_backend npx prisma migrate deploy
docker exec fichaje_backend npm run db:seed
```

---

## Despliegue a producción

### 1. Preparar servidor (Ubuntu 22.04)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx
sudo usermod -aG docker $USER
```

### 2. Obtener certificado SSL

```bash
sudo certbot --nginx -d tu-dominio.com
```

### 3. Variables de producción

```bash
cp .env.example .env.prod
# Edita .env.prod:
# - JWT_SECRET: genera con: openssl rand -hex 64
# - JWT_REFRESH_SECRET: genera con: openssl rand -hex 64
# - POSTGRES_PASSWORD: contraseña fuerte
# - CORS_ORIGINS: tu dominio de producción
```

### 4. Build y deploy

```bash
# Build imágenes
docker build -t fichaje-backend:latest ./apps/backend
docker build -t fichaje-web:latest ./apps/web

# Arrancar producción
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Migraciones
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### 5. Actualizar en producción (rolling update)

```bash
docker build -t fichaje-backend:latest ./apps/backend
docker-compose -f docker-compose.prod.yml up -d --no-deps backend
```

---

## Modo kiosco — Guía de configuración

### Instalar como PWA (pantalla táctil / recepción)

1. Abre `http://tu-dominio.com/kiosk?company=COMPANY_ID` en Chrome/Edge
2. Menú → "Instalar aplicación" o "Agregar a pantalla de inicio"
3. Abre la app instalada → se abre en pantalla completa sin barra de navegación
4. Configura el dispositivo en modo kiosco del SO para mayor seguridad

### Configurar ID de empresa

El kiosco necesita el `companyId`. Opciones:

- URL param: `/kiosk?company=clxxx123`
- Doble-clic en esquina superior derecha para panel de configuración
- Variable de entorno: `NEXT_PUBLIC_KIOSK_COMPANY_ID=clxxx123`

### Métodos de identificación soportados

| Método | Descripción |
|--------|-------------|
| PIN    | Código empleado + PIN 4-8 dígitos (recomendado) |
| Código | Solo código de empleado (menor seguridad) |
| QR     | Token QR generado desde el panel admin |
| NFC    | Preparado en arquitectura (implementación futura) |

---

## Geolocalización — Reglas de negocio

- Cada centro tiene un radio en metros configurable (por defecto 200m)
- La tolerancia configurable amplía el radio sin bloquear (por defecto +50m)
- Fichajes fuera de zona se marcan como `OUT_OF_ZONE` y generan incidencia automática
- Si GPS no está disponible, el fichaje se permite pero queda sin coordenadas
- En app móvil: si GPS falla → aviso al usuario → puede fichar con confirmación explícita
- La distancia se calcula con la fórmula Haversine (precisión ~1m)

---

## Lógica de estados de fichaje

```
NOT_CLOCKED_IN → CHECK_IN → WORKING
WORKING → BREAK_START → ON_BREAK
ON_BREAK → BREAK_END → WORKING
WORKING → CHECK_OUT → CLOCKED_OUT
CLOCKED_OUT → CHECK_IN (nuevo día) → WORKING
```

**Reglas de negocio aplicadas:**
- No puede entrar si ya está dentro
- No puede salir si no ha entrado
- No puede pausar si ya está en pausa
- No puede salir si está en pausa activa
- Pausas múltiples por día: sí permitido
- Fichajes múltiples por día: sí (turnos partidos)
- Horario nocturno: soportado (basado en timestamp exacto)

---

## Próximos pasos / Roadmap

### v1.1
- [ ] Notificaciones push (recordatorio fichaje, incidencias)
- [ ] Soporte NFC en kiosco (Web NFC API)
- [ ] Reconocimiento facial para verificación en kiosco
- [ ] Turnos y horarios teóricos con cálculo de desviación

### v1.2
- [ ] Integración con Nóminas (A3, Sage, Holded)
- [ ] Firma electrónica de partes de horas
- [ ] App manager para supervisores
- [ ] Alertas en tiempo real (Slack, email) para incidencias

### v2.0
- [ ] Módulo de vacaciones y ausencias
- [ ] Portal self-service del empleado (solicitudes)
- [ ] Integración con HR software (BambooHR, Personio)
- [ ] Analytics avanzado con IA (predicción de absentismo)
- [ ] API pública para integraciones de terceros
- [ ] White-label para revendedores
