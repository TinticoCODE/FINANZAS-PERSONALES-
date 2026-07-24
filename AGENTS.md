<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SharkMoney — Guía para agentes

Proyecto de finanzas personales en `/home/pedrito-pc/Projects/personal-finance`.

## Contexto rápido

- **Nombre producto:** SharkMoney.
- **BD:** PostgreSQL — Docker local, Neon en producción (pooler + `connection_limit=1`).
- **Auth:** Login admin con JWT en cookie (`src/lib/session.ts`, `src/middleware.ts`).
- **Usuario:** Patrón de un solo usuario vía `getDefaultUserId()` en `src/lib/user.ts`.
- **Deploy:** Vercel desde `master`; build = `prisma db push && next build`.
- **PWA:** Serwist (`@serwist/turbopack`), manifest en `src/app/manifest.ts`, SW en `src/app/sw.ts`.
- **Comentarios:** solo español; nombres de código (variables, funciones, tipos) en inglés.

## Reglas de negocio críticas

### Transacciones personales — activo vs pasivo

- **Ingreso:** solo `accountId` → incrementa balance de cuenta.
- **Gasto débito/efectivo:** solo `accountId` → decrementa balance.
- **Gasto crédito:** solo `creditCardId`, `accountId` null → incrementa `usedBalance` de la tarjeta.
- Validación en `validateTransactionFunding()` en `src/actions/finance.actions.ts`.
- Patrón resiliente: `createTransaction` retorna `{ ok, error }`; pasar `tx` a `applyTransactionEffects` dentro de `$transaction`.
- En UI: ocultar cuenta bancaria cuando `paymentMethod === "CREDIT"`.

### Tarjetas de crédito

- Motor en `src/services/credit-card.service.ts`.
- 1 cuota = 0% interés; >1 cuota = TEA + amortización francesa; MSI = sin interés punitorio.
- `interestRate` en tarjeta = Tasa Efectiva Anual (TEA %).
- Cron de corte: `/api/cron/daily` (unificado, 05:00 UTC).

### Emprendimientos — partida doble

- Ledger aislado: `BusinessJournalEntry` + cuentas 1100/1200/1300/2100/3100.
- **Caja (1100) nunca negativa:** `assertSufficientCash` en `src/domain/business/business-cash-balance.ts`.
- **Compras inventario:** `postInventoryPurchase` — split caja/CxP si no hay fondos.
- **BusinessTransaction:** registrar cada movimiento con tipo y `cashEffect`.
- **Cobro cuotas:** `processInstallmentPayment` — abono parcial, destino caja o cuenta personal.
- KPIs: capital = Σ `CAPITAL_INJECTION`; caja = fórmula en `computeBusinessCashBalance`.

### Préstamos personales

- `registerLoanPayment`: abono parcial, incrementa `destinationAccountId` atómicamente.

### Reportes

- Cierres mensuales inmutables (`MonthlySnapshot`); mes actual calculado en vivo.
- Cron cierra mes anterior en `/api/cron/daily`.

## Convenciones UI

- Selects (Base UI): label explícito como children de `SelectTrigger`, no confiar en IDs crudos.
- Formularios CRUD en `*-view.tsx` o `*-dialog.tsx` dentro de `Dialog`.
- Dashboard FAB: `src/features/dashboard/dashboard-fab.tsx`.
- Abonos: modal con monto editable + selector de cuenta destino obligatorio.

## Archivos clave

| Área | Archivos |
|------|----------|
| Schema | `prisma/schema.prisma` |
| Acciones personales | `src/actions/finance.actions.ts`, `auth.actions.ts` |
| Acciones negocio | `src/actions/business.actions.ts` |
| Datos dashboard | `src/services/data.service.ts` |
| Datos negocio | `src/services/business-data.service.ts` |
| Crédito | `src/services/credit-card.service.ts` |
| Ledger negocio | `src/domain/business/journal.service.ts` |
| Caja negocio | `src/domain/business/business-cash-balance.ts` |
| Compras CxP | `src/domain/business/purchase.service.ts` |
| Ventas/abonos | `src/domain/business/sale.service.ts` |
| Neon pooler | `src/lib/database-url.ts`, `src/lib/prisma.ts` |
| PWA | `next.config.ts`, `src/app/sw.ts`, `src/app/manifest.ts` |
| Tipos UI | `src/types/index.ts`, `src/lib/mappers.ts` |
| Labels ES | `src/lib/labels.ts` |

## Comandos

```bash
npm run dev
npm run build
npm run db:push
npm run docker:up
npx vercel deploy --prod --yes
python3 scripts/generate-pwa-icons.py
```

## Variables de entorno

Ver `.env.example`. En producción obligatorios: `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_*`, `CRON_SECRET`.

## Middleware — rutas públicas sin auth

`/_next`, `/api`, `/serwist`, `/~offline`, archivos estáticos (contienen `.`).

## Producción

- URL: https://personal-finance-three-kappa.vercel.app
- Neon: usar endpoint `-pooler`; la app añade `connection_limit=1`.
- Sincronizar schema: `DATABASE_URL=<neon> npx prisma db push`
