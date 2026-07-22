# SharkMoney — Finanzas Personales

Aplicación web para administrar finanzas personales con datos reales en PostgreSQL, lógica de tarjetas de crédito revolvente, dashboard interactivo y autenticación de administrador.

**Producción:** https://personal-finance-three-kappa.vercel.app  
**Repositorio:** https://github.com/TinticoCODE/FINANZAS-PERSONALES-

## Características

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Resumen mensual, gráficos, FAB para acciones rápidas |
| **Transacciones** | Ingresos, gastos y compras con tarjeta (cuotas + TEA) |
| **Tarjetas** | Crédito revolvente, corte, pago sin intereses calculado |
| **Cuentas** | Activos bancarios (efectivo, bancos, Nequi, etc.) |
| **Presupuestos** | Control por categoría mes a mes |
| **Metas** | Ahorros con progreso |
| **Calendario** | Cortes, pagos y recordatorios |
| **Reportes** | Evolución y gastos por categoría |

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **Shadcn/UI** + **Framer Motion**
- **Recharts** — gráficos
- **Prisma 6** + **PostgreSQL**
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
| `DATABASE_URL` | Connection string PostgreSQL (local o Neon) |
| `ADMIN_USERNAME` | Usuario del login admin |
| `ADMIN_PASSWORD` | Contraseña del login admin |
| `AUTH_SECRET` | Secreto para firmar la cookie de sesión (obligatorio en producción) |

## Despliegue (Vercel + Neon)

1. Crear proyecto en [Neon](https://neon.tech) y copiar `DATABASE_URL`.
2. Conectar el repo en [Vercel](https://vercel.com).
3. Configurar en Vercel (Production, Preview, Development):
   - `DATABASE_URL`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `AUTH_SECRET`
4. Cada deploy ejecuta `prisma db push` antes del build (ver `vercel.json`).

## Modelo de transacciones (activos vs pasivos)

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
- **Pago para no generar intereses** (`src/services/credit-card.service.ts`):
  - Suma de compras a 1 cuota del ciclo actual.
  - Más cuotas (capital + interés) de compras diferidas de ciclos anteriores.

## Estructura del proyecto

```
src/
├── actions/           # Server actions (CRUD, auth)
├── app/
│   ├── login/
│   └── (dashboard)/   # Rutas protegidas
├── components/        # UI, layout, shared
├── features/          # Vistas por módulo (*-view.tsx)
├── lib/               # labels, mappers, session, utils
├── middleware.ts      # Protección de rutas
├── services/          # data.service, credit-card.service
└── types/
prisma/
└── schema.prisma
```

## Scripts útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run db:push      # Sincronizar schema con la BD
npm run db:studio    # Prisma Studio (explorar datos)
npm run docker:up    # Levantar PostgreSQL
npm run docker:down  # Detener PostgreSQL
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
| `/calendar` | Calendario financiero |
| `/reports` | Reportes |
| `/settings` | Configuración |

## Licencia

Proyecto privado — uso personal.
