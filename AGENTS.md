<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SharkMoney — Guía para agentes

Proyecto de finanzas personales en `/home/pedrito-pc/Projects/personal-finance`.

## Contexto rápido

- **Nombre producto:** SharkMoney (antes FinFlow).
- **BD:** PostgreSQL — Docker local, Neon en producción.
- **Auth:** Login admin con JWT en cookie (`src/lib/session.ts`, `src/middleware.ts`).
- **Usuario:** Patrón de un solo usuario vía `getDefaultUserId()` en `src/lib/user.ts`.
- **Deploy:** Vercel auto-deploy desde `master`; build incluye `prisma db push`.

## Reglas de negocio críticas

### Transacciones — activo vs pasivo

- **Ingreso:** solo `accountId` → incrementa balance de cuenta.
- **Gasto débito/efectivo:** solo `accountId` → decrementa balance.
- **Gasto crédito:** solo `creditCardId`, `accountId` null → incrementa `usedBalance` de la tarjeta.
- Validación en `validateTransactionFunding()` en `src/actions/finance.actions.ts`.
- En UI: ocultar cuenta bancaria cuando `paymentMethod === "CREDIT"`.

### Tarjetas de crédito

- Motor en `src/services/credit-card.service.ts`.
- Campo `installments` en `Transaction` (default 1).
- 1 cuota = 0% interés; >1 cuota = TEA + amortización francesa.
- `interestRate` en tarjeta = Tasa Efectiva Anual (TEA %).

## Convenciones UI

- Selects (Base UI): pasar label explícito como children de `SelectValue`, no confiar en el `value` crudo (IDs largos).
- Formularios CRUD en `*-view.tsx` dentro de `Dialog`.
- Dashboard FAB: `src/features/dashboard/dashboard-fab.tsx`.

## Archivos clave

| Área | Archivos |
|------|----------|
| Schema | `prisma/schema.prisma` |
| Acciones | `src/actions/finance.actions.ts`, `auth.actions.ts` |
| Datos | `src/services/data.service.ts` |
| Crédito | `src/services/credit-card.service.ts` |
| Tipos UI | `src/types/index.ts`, `src/lib/mappers.ts` |
| Labels ES | `src/lib/labels.ts` |

## Comandos

```bash
npm run dev
npm run build
npm run db:push
npm run docker:up
```

## Producción

- URL: https://personal-finance-three-kappa.vercel.app
- Neon project id: `empty-cell-04463985`
- Sincronizar schema en Neon: `DATABASE_URL=<neon> npx prisma db push`
