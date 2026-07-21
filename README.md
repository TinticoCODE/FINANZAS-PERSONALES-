# FinFlow — Finanzas Personales

Aplicación web moderna para administrar finanzas personales con diseño premium, animaciones fluidas y arquitectura escalable.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **Shadcn/UI**
- **Framer Motion** — animaciones
- **Recharts** — gráficos interactivos
- **Prisma** + **PostgreSQL** (Docker)
- **React Hook Form** + **Zod**
- **next-themes** — modo oscuro/claro

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar PostgreSQL
npm run docker:up

# 3. Configurar base de datos
cp .env.example .env
npm run db:push
npm run db:generate

# 4. Iniciar desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura

```
src/
├── app/(dashboard)/     # Rutas de la aplicación
├── components/          # UI compartida y layout
├── features/            # Módulos por dominio
│   ├── dashboard/
│   ├── transactions/
│   ├── cards/
│   ├── budgets/
│   ├── accounts/
│   ├── goals/
│   ├── calendar/
│   ├── reports/
│   └── search/
├── hooks/
├── lib/
├── services/
└── types/
prisma/
└── schema.prisma
```

## Módulos

| Módulo | Ruta | Estado |
|--------|------|--------|
| Dashboard | `/` | UI + datos mock |
| Transacciones | `/transactions` | UI + datos mock |
| Tarjetas | `/cards` | UI + datos mock |
| Presupuestos | `/budgets` | UI + datos mock |
| Cuentas | `/accounts` | UI + datos mock |
| Metas | `/goals` | UI + datos mock |
| Calendario | `/calendar` | UI + datos mock |
| Reportes | `/reports` | UI + exportación (stub) |
| Configuración | `/settings` | UI básica |

## Próximos pasos

- Conectar módulos a Prisma (CRUD real)
- Autenticación de usuarios
- Formularios con React Hook Form + Zod
- Exportación PDF/Excel/CSV
- Notificaciones en tiempo real
