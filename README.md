# SharkMoney — Finanzas Personales

Aplicación web (y **PWA instalable**) para administrar finanzas personales y emprendimientos, con datos reales en PostgreSQL, lógica de tarjetas revolvente, ledger comercial con partida doble y autenticación de administrador.

**Producción:** https://personal-finance-three-kappa.vercel.app  
**Repositorio:** https://github.com/TinticoCODE/FINANZAS-PERSONALES-

## Características

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Resumen mensual, gráficos, FAB para acciones rápidas |
| **Transacciones** | Ingresos, gastos y compras con tarjeta (cuotas + TEA + MSI) |
| **Tarjetas** | Crédito revolvente, corte, pago sin intereses calculado |
| **Cuentas** | Activos bancarios (efectivo, bancos, Nequi, etc.) |
| **Presupuestos** | Control por categoría mes a mes |
| **Metas** | Ahorros con progreso y aportes desde cuenta |
| **Préstamos** | CxC personales con abonos parciales y cuenta destino |
| **Emprendimientos** | Ledger comercial aislado: ventas, inventario, CxC, CxP, caja |
| **Calendario** | Cortes, pagos y recordatorios |
| **Reportes** | Evolución anual con cierres mensuales inmutables |
| **Recurrentes** | Plantillas de movimientos automáticos |
| **PWA** | Instalable en Android/iOS; caché offline con Serwist |

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **Shadcn/UI** + **Framer Motion**
- **Recharts** — gráficos
- **Prisma 6** + **PostgreSQL** (Docker local / Neon producción)
- **Serwist** — service worker y precache PWA
- **jose** — sesión JWT en cookie
- **Docker** — PostgreSQL local

## Inicio rápido (local)

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env

# 3. PostgreSQL con Docker
npm run docker:up

# 4. Schema y cliente Prisma
npm run db:push
npm run db:generate

# 5. Desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).  
Credenciales por defecto: ver `.env.example` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string PostgreSQL (local o Neon con `-pooler`) |
| `ADMIN_USERNAME` | Usuario del login admin |
| `ADMIN_PASSWORD` | Contraseña del login admin |
| `AUTH_SECRET` | Secreto para firmar la cookie de sesión (obligatorio en producción) |
| `CRON_SECRET` | Bearer token para `/api/cron/*` (obligatorio en producción) |

En Neon, la app ajusta automáticamente `connection_limit=1` y `pool_timeout=0` vía `src/lib/database-url.ts`.

## Despliegue (Vercel + Neon)

1. Crear proyecto en [Neon](https://neon.tech) y copiar `DATABASE_URL` (endpoint **pooler**).
2. Conectar el repo en [Vercel](https://vercel.com).
3. Configurar en Vercel (Production, Preview, Development):
   - `DATABASE_URL`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `AUTH_SECRET`
   - `CRON_SECRET`
4. Cada deploy ejecuta `prisma db push` antes del build (ver `vercel.json`).
5. Cron unificado: `0 5 * * *` UTC → `/api/cron/daily`.

```bash
npx vercel deploy --prod --yes
```

## PWA (instalable en móvil)

| Recurso | Ubicación |
|---------|-----------|
| Manifiesto | `src/app/manifest.ts` → `/manifest.webmanifest` |
| Service worker | `src/app/sw.ts` → `/serwist/sw.js` |
| Íconos | `public/icons/` (192, 512, apple-touch 180) |
| Página offline | `/~offline` |

Regenerar íconos tras cambiar el logo:

```bash
python3 scripts/generate-pwa-icons.py
```

**Android:** Chrome → Instalar app. **iOS:** Safari → Compartir → Añadir a pantalla de inicio.

## Modelo de transacciones personales (activos vs pasivos)

Una transacción tiene **un solo origen de fondos**:

| Tipo | Método | Campo en BD | Efecto |
|------|--------|-------------|--------|
| Ingreso | Transferencia | `accountId` | + balance cuenta |
| Gasto | Débito / efectivo | `accountId` | − balance cuenta |
| Gasto | Tarjeta de crédito | `creditCardId` | + `usedBalance` tarjeta |

- `accountId` y `creditCardId` **nunca** van ambos en un gasto común.
- En el formulario, al elegir **Tarjeta de crédito** se oculta el selector de cuenta bancaria.

## Lógica de tarjetas de crédito

- **1 cuota** → 0% interés (periodo de gracia).
- **>1 cuota** → amortización francesa con la **TEA** configurada en la tarjeta.
- **MSI** (3, 6, 9 meses) → cuotas iguales sin interés punitorio.
- **Pago para no generar intereses** (`src/services/credit-card.service.ts`):
  - Suma de compras a 1 cuota del ciclo actual.
  - Más cuotas (capital + interés) de compras diferidas de ciclos anteriores.

## Módulo Emprendimientos (ledger comercial)

Ledger aislado del libro personal con partida doble (`BusinessJournalEntry` / `BusinessJournalLine`).

### Plan de cuentas (sistema)

| Código | Cuenta | Tipo |
|--------|--------|------|
| 1100 | Caja del negocio | Activo |
| 1200 | Cuentas por cobrar | Activo |
| 1300 | Inventario | Activo |
| 2100 | Cuentas por pagar (CxP) | Pasivo |
| 3100 | Capital del dueño | Patrimonio |

### Reglas contables

- **Caja (1100)** no puede quedar negativa: validación en `assertSufficientCash`.
- **Compra de inventario** sin caja suficiente → obligatorio registrar CxP al proveedor o inyectar capital.
- **Capital invertido** = suma de `CAPITAL_INJECTION`.
- **Caja** = (Capital + Cobros) − (Pagos proveedores + Gastos operativos + Retiros).

### Tipos de movimiento (`BusinessTransaction`)

`CAPITAL_INJECTION`, `SUPPLIER_PURCHASE`, `CASH_SALE`, `CREDIT_SALE`, `INSTALLMENT_PAYMENT`, `OPERATING_EXPENSE`, `OWNER_WITHDRAWAL`.

### Cobro de cuotas comerciales

- Abonos parciales soportados.
- Selector obligatorio de **cuenta destino**: Caja del negocio (1100) o cuenta personal (Nequi, etc.).
- Server action: `processInstallmentPaymentAction` en `src/actions/business.actions.ts`.

## Préstamos personales

- Abonos parciales con asignación capital/interés.
- El dinero incrementa la cuenta destino seleccionada en la misma transacción Prisma.
- Servicio: `registerLoanPayment` en `src/actions/finance.actions.ts`.

## Estructura del proyecto

```
src/
├── actions/              # Server actions (CRUD, auth, negocio)
├── app/
│   ├── login/
│   ├── manifest.ts       # PWA manifest
│   ├── sw.ts             # Service worker (Serwist)
│   ├── serwist/          # Ruta del SW compilado
│   ├── ~offline/         # Fallback sin conexión
│   ├── api/cron/         # Tareas programadas
│   └── (dashboard)/      # Rutas protegidas
├── components/           # UI, layout, providers
├── domain/               # Lógica de negocio pura
│   ├── business/         # Ledger, ventas, compras, caja
│   ├── billing/          # Zona horaria, cortes TC
│   ├── credit/           # MSI, cuotas
│   ├── loans/            # Cálculos de préstamos
│   └── snapshots/        # Cierres mensuales
├── features/             # Vistas por módulo (*-view.tsx)
├── lib/                  # labels, mappers, session, prisma
├── middleware.ts         # Protección de rutas + rutas PWA públicas
├── services/             # data.service, credit-card, business-data
└── types/
prisma/
└── schema.prisma
public/
└── icons/                # Íconos PWA
scripts/
└── generate-pwa-icons.py
```

## Scripts útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run db:push      # Sincronizar schema con la BD
npm run db:studio    # Prisma Studio (explorar datos)
npm run docker:up    # Levantar PostgreSQL
npm run docker:down  # Detener PostgreSQL
python3 scripts/generate-pwa-icons.py  # Regenerar íconos PWA
```

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión admin |
| `/` | Dashboard |
| `/transactions` | Transacciones |
| `/cards` | Tarjetas de crédito |
| `/accounts` | Cuentas bancarias |
| `/budgets` | Presupuestos |
| `/goals` | Metas de ahorro |
| `/loans` | Préstamos / cuentas por cobrar |
| `/business` | Lista de emprendimientos |
| `/business/[slug]` | Dashboard comercial |
| `/recurring` | Movimientos recurrentes |
| `/calendar` | Calendario financiero |
| `/reports` | Reportes y cierres mensuales |
| `/settings` | Configuración |

## Convenciones del código

- **Comentarios:** solo en español (identificadores de código en inglés).
- **Server actions resilientes:** patrón `{ ok: true } | { ok: false, error }` en transacciones y abonos.
- **Zona horaria:** `User.timezone` (IANA) para cortes, recurrentes y reportes.

## Licencia

Proyecto privado — uso personal.
