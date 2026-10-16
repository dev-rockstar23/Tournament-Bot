# Implementation Plan: Multi-Tenant Razorpay Payment System

## Overview

Implement a multi-tenant payment system where tournament organizers configure their own Razorpay credentials (Key ID, Key Secret, Webhook Secret). The platform uses these credentials per-tournament to create Razorpay orders, verify webhook signatures, and auto-approve player registrations upon successful payment.

## Project Context

**Build System**: pnpm workspaces monorepo (11 packages + 3 apps)  
**Database**: PostgreSQL via Prisma 5.22.0  
**Web Framework**: Next.js 14.2.3 (App Router)  
**Build Commands**: `pnpm build` (recursive), `pnpm build:web` (web only)  
**Test Commands**: `pnpm test` (recursive, currently no tests in project)  
**DB Commands**: `pnpm db:migrate` (from root), `pnpm --filter @esports/database exec prisma migrate dev`  
**Key Files**:
- Schema: `packages/database/prisma/schema.prisma`
- Payments package: `packages/payments/src/` (orders.ts, webhooks.ts, state-machine.ts, errors.ts, index.ts)
- Web API routes: `apps/web/src/app/api/servers/[guildId]/`
- Admin UI: `apps/web/src/app/servers/[guildId]/admin/`

**Existing Patterns**:
- All API routes use `withPermission(AppRole.X, async (req, { guildId }) => {...})` from `@esports/permissions`
- Admin pages check role server-side, render error if insufficient
- Settings panel: `ServerSettingsPanel` client component with tabs (General, Discord Channels, Staff, Integrations)
- TypeScript strict mode, zod validation on API inputs
- Payment module has feature gate: `PAYMENTS_ENABLED=false` env var

---

## Implementation Plan

- [ ] 1. **Create database migration for OrganizerPaymentConfig model**
      Add new Prisma model with encrypted credential storage. Tournament gets optional FK to payment config.
      Files: `packages/database/prisma/schema.prisma`
      Changes:
      ```prisma
      model OrganizerPaymentConfig {
        id                    String   @id @default(cuid())
        guildId               String   @map("guild_id")
        userId                String   @map("user_id")
        provider              String   @default("RAZORPAY")
        razorpayKeyIdEnc      String   @map("razorpay_key_id_enc")
        razorpayKeySecretEnc  String   @map("razorpay_key_secret_enc")
        razorpayWebhookSecEnc String   @map("razorpay_webhook_sec_enc")
        isActive              Boolean  @default(true) @map("is_active")
        isVerified            Boolean  @default(false) @map("is_verified")
        createdAt             DateTime @default(now()) @map("created_at")
        updatedAt             DateTime @updatedAt @map("updated_at")
        
        server      DiscordServer @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
        tournaments Tournament[]
        
        @@unique([guildId, userId])
        @@map("organizer_payment_configs")
      }
      ```
      Add to Tournament model:
      ```prisma
      paymentConfigId String? @map("payment_config_id")
      paymentConfig   OrganizerPaymentConfig? @relation(fields: [paymentConfigId], references: [id])
      ```
      Add to DiscordServer model relations:
      ```prisma
      paymentConfigs OrganizerPaymentConfig[]
      ```
      Verify: Run `pnpm --filter @esports/database exec prisma format` (should succeed with no errors), then `pnpm --filter @esports/database exec prisma migrate dev --name add-organizer-payment-config` (creates migration file and applies it).

- [ ] 2. **Install razorpay npm package in payments package**
      Add official Razorpay Node SDK to enable order creation and signature verification.
      Files: `packages/payments/package.json`
      Command: `cd packages/payments && pnpm add razorpay`
      Verify: `pnpm --filter @esports/payments list razorpay` shows the package installed.

- [ ] 3. **Create encryption utility module**
      Implement AES-256-GCM encryption/decryption for storing Razorpay credentials in the database.
      Files: `packages/payments/src/encryption.ts`
      Functions:
      ```typescript
      export function encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string }
      export function decrypt(encrypted: string, iv: string, authTag: string): string
      ```
      Uses `crypto` module with `ENCRYPTION_KEY` env var (32-byte hex string). Store IV and authTag in format `{iv}:{authTag}:{ciphertext}` as single string column. Throw error if ENCRYPTION_KEY missing.
      Verify: TypeScript compiles with `pnpm --filter @esports/payments type-check` (0 errors).

- [ ] 4. **Create Razorpay integration module**
      Implement Razorpay order creation and payment signature verification using the official SDK.
      Files: `packages/payments/src/razorpay.ts`
      Functions:
      ```typescript
      export async function createRazorpayOrder({
        keyId: string,
        keySecret: string,
        amount: number,
        currency: string,
        receiptId: string,
      }): Promise<{ id: string; amount: number; currency: string }>
      
      export function verifyPaymentSignature({
        orderId: string,
        paymentId: string,
        signature: string,
        secret: string,
      }): boolean
      ```
      `createRazorpayOrder` instantiates Razorpay SDK client with keyId/keySecret, calls `instance.orders.create()`, returns { id, amount, currency }. `verifyPaymentSignature` uses `crypto.createHmac('sha256', secret).update(orderId + '|' + paymentId).digest('hex')` and compares with signature using `timingSafeEqual`.
      Verify: TypeScript compiles with `pnpm --filter @esports/payments type-check` (0 errors).

- [ ] 5. **Update payments package index exports**
      Export new modules (encryption, razorpay) from the package entry point.
      Files: `packages/payments/src/index.ts`
      Add lines:
      ```typescript
      export * from './encryption'
      export * from './razorpay'
      ```
      Verify: TypeScript compiles with `pnpm --filter @esports/payments type-check` (0 errors).

- [ ] 6. **Modify createOrder to integrate with Razorpay**
      After creating DB Order row, fetch tournament's paymentConfig, decrypt credentials, call createRazorpayOrder, store Razorpay order_id in providerRef, return both DB order and Razorpay checkout data.
      Files: `packages/payments/src/orders.ts`
      Changes:
      - Import `decrypt` from `./encryption`, `createRazorpayOrder` from `./razorpay`
      - Add `guildId` to function signature: `createOrder({ registrationId, amount, currency, expiresInMinutes, guildId })`
      - After loading tournament, also load `paymentConfig` relation: `select: { id: true, teamCapacity: true, paymentConfig: true }`
      - If `!tournament.paymentConfig`, throw error: `Tournament ${tournament.id} has no payment configuration. Organizer must configure Razorpay credentials.`
      - Decrypt credentials from `paymentConfig`: parse `razorpayKeyIdEnc`, `razorpayKeySecretEnc` (format: `iv:authTag:ciphertext`), call `decrypt()` for each
      - After creating Order in DB, call `createRazorpayOrder({ keyId, keySecret, amount, currency, receiptId: order.id })`
      - Update Order row with `providerRef: razorpayOrder.id`
      - Return object: `{ order, razorpayCheckout: { orderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency, keyId } }`
      Verify: TypeScript compiles with `pnpm --filter @esports/payments type-check` (0 errors).

- [ ] 7. **Modify processWebhookEvent to use providerRef and verify organizer signature**
      Look up Order by providerRef (Razorpay order_id) instead of internal id. Fetch tournament paymentConfig, verify webhook signature using organizer's webhookSecret. Respect tournament.autoApprove flag before updating registration status.
      Files: `packages/payments/src/webhooks.ts`
      Changes:
      - Function signature: `processWebhookEvent({ providerEventId, razorpayOrderId, eventType, amount, currency, paymentId, signature })`
      - Load Order by `providerRef: razorpayOrderId` (not by `id`), include `registration.tournament.paymentConfig` relation
      - If no paymentConfig, throw error: `Tournament has no payment configuration.`
      - Decrypt `razorpayWebhookSecEnc` from paymentConfig
      - Verify webhook signature using `verifyRazorpaySignature(body, signature, secret)` from existing code pattern
      - In transaction, after updating Order status to PAID, check `tournament.autoApprove`: if true, set registration status to APPROVED; if false, leave as PENDING (manual approval needed)
      Verify: TypeScript compiles with `pnpm --filter @esports/payments type-check` (0 errors).

- [ ] 8. **Update orders API route to pass guildId and return Razorpay checkout data**
      Modify POST /api/servers/[guildId]/orders to pass guildId to createOrder, return Razorpay checkout details for frontend to initiate payment.
      Files: `apps/web/src/app/api/servers/[guildId]/orders/route.ts`
      Changes:
      - In `createOrder()` call, add `guildId` parameter
      - Destructure returned object: `const { order, razorpayCheckout } = await createOrder({ ... })`
      - Return JSON: `{ order, razorpayCheckout }` with status 201
      Verify: TypeScript compiles with `pnpm --filter web type-check` (0 errors).

- [ ] 9. **Create Razorpay webhook API route**
      New POST endpoint to receive Razorpay webhook events. Verifies signature, calls processWebhookEvent.
      Files: `apps/web/src/app/api/payments/webhooks/razorpay/route.ts`
      Implementation:
      ```typescript
      import { NextResponse } from 'next/server'
      import { processWebhookEvent } from '@esports/payments'
      
      export async function POST(req: Request) {
        if (process.env.PAYMENTS_ENABLED !== 'true') {
          return NextResponse.json({ error: 'Payments disabled' }, { status: 503 })
        }
        
        const body = await req.text()
        const signature = req.headers.get('x-razorpay-signature')
        if (!signature) {
          return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
        }
        
        let event: any
        try {
          event = JSON.parse(body)
        } catch {
          return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        
        const { event: eventType, payload } = event
        const { order, payment } = payload
        
        await processWebhookEvent({
          providerEventId: payment.entity.id,
          razorpayOrderId: order.entity.id,
          eventType,
          amount: payment.entity.amount / 100, // Razorpay sends paise
          currency: payment.entity.currency,
          paymentId: payment.entity.id,
          signature,
        })
        
        return NextResponse.json({ received: true })
      }
      ```
      Verify: TypeScript compiles with `pnpm --filter web type-check` (0 errors).

- [ ] 10. **Create payment config API routes (GET, POST, DELETE)**
       CRUD endpoints for organizers to manage their Razorpay credentials.
       Files: `apps/web/src/app/api/servers/[guildId]/payment-config/route.ts`
       Implementation:
       - GET: withPermission(AppRole.SERVER_ADMIN), load OrganizerPaymentConfig where guildId + userId, return masked credentials (only last 4 chars of keyId, boolean hasSecret, boolean hasWebhookSecret, isActive, isVerified)
       - POST: withPermission(AppRole.SERVER_ADMIN), zod schema `{ keyId: string, keySecret: string, webhookSecret: string }`, encrypt all three, upsert OrganizerPaymentConfig, return success
       - DELETE: withPermission(AppRole.SERVER_ADMIN), delete OrganizerPaymentConfig where guildId + userId, return success
       Verify: TypeScript compiles with `pnpm --filter web type-check` (0 errors).

- [ ] 11. **Create payment settings admin page UI**
       Server admin page for configuring Razorpay credentials. Form with 3 password inputs (Key ID, Key Secret, Webhook Secret), save button, test connection button (optional), delete config button.
       Files: `apps/web/src/app/servers/[guildId]/admin/payment/page.tsx`
       Pattern: Copy structure from `apps/web/src/app/servers/[guildId]/admin/settings/page.tsx`. Server-side auth check (AppRole.SERVER_ADMIN), load existing config server-side (masked), pass to client component.
       Client component: `apps/web/src/components/admin/PaymentConfigPanel.tsx` (new file). Form with 3 inputs (type="password"), save handler calls POST /api/servers/{guildId}/payment-config, delete handler calls DELETE. Show success/error toast messages. Display current status: "Configured ✅" or "Not configured ⚠️".
       Verify: TypeScript compiles with `pnpm --filter web type-check` (0 errors), page renders at `/servers/{guildId}/admin/payment`.

- [ ] 12. **Add "Payment Settings" link to admin navigation**
       Add navigation item in server admin layout/menu to access the new payment settings page.
       Files: Find existing admin layout file (likely `apps/web/src/app/servers/[guildId]/admin/layout.tsx` or navigation component), add link to `/servers/[guildId]/admin/payment` labeled "Payment Settings" or "Razorpay Config".
       Verify: Navigate to admin area, see new link, click it, page loads.

- [ ] 13. **Update .env.local with required environment variables**
       Add PAYMENTS_ENABLED=true and ENCRYPTION_KEY (32-byte hex string, 64 chars).
       Files: `.env.local`
       Add lines:
       ```
       PAYMENTS_ENABLED=true
       ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
       ```
       (Generate real random 64-char hex string for ENCRYPTION_KEY using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
       Verify: Run `node -e "console.log(process.env.ENCRYPTION_KEY?.length)"` after sourcing .env.local (should output 64).

- [ ] 14. **Generate Prisma client and rebuild all packages**
       Regenerate Prisma types after schema changes, rebuild all TypeScript packages to ensure no compilation errors.
       Files: All packages
       Commands:
       ```bash
       pnpm db:generate
       pnpm build
       ```
       Verify: Both commands exit with code 0, no TypeScript errors. Check `packages/database/src/generated/client/index.d.ts` includes `OrganizerPaymentConfig` type.

- [ ] 15. **Test payment flow end-to-end (manual verification)**
       Smoke test the full payment cycle: configure credentials → create tournament → register → pay → webhook → approval.
       Steps:
       1. Run `pnpm dev` (starts Next.js dev server)
       2. Login via Discord OAuth, navigate to `/servers/{guildId}/admin/payment`
       3. Enter test Razorpay credentials (use Razorpay test mode keys), save
       4. Create new PAID tournament with entryPrice=100, currency=INR, autoApprove=true
       5. Register a team (should call POST /api/servers/{guildId}/orders and receive razorpayCheckout object)
       6. Simulate webhook POST to `/api/payments/webhooks/razorpay` with test event payload (payment.captured)
       7. Verify registration status changes to APPROVED in database
       8. Check no errors in terminal logs
       Verify: Payment flow completes without exceptions. Registration status updates correctly. Order providerRef populated with Razorpay order_id.

---

## Key Design Decisions

1. **Multi-tenancy approach**: Each server (guildId) + organizer (userId) gets one payment config. Tournaments link to a config via FK. This allows multiple organizers per server in future, and isolates credentials per organizer.

2. **Encryption**: Store credentials encrypted at rest using AES-256-GCM with a platform-wide ENCRYPTION_KEY. IV and authTag stored alongside ciphertext in format `{iv}:{authTag}:{ciphertext}`. Decryption happens only in payment package functions, never sent to client.

3. **Webhook security**: Verify Razorpay signature using the organizer's webhookSecret (fetched via tournament → paymentConfig relation). Prevents webhook spoofing.

4. **Order lookup**: Webhook looks up Order by `providerRef` (Razorpay order_id), not by internal DB id. This avoids exposing internal IDs in external webhooks.

5. **Auto-approve flag**: Tournament.autoApprove controls whether paid registrations are auto-approved or require manual review. Checked in processWebhookEvent after payment succeeds.

6. **Feature gate**: PAYMENTS_ENABLED env var guards all payment routes and functions. Set to true only after legal review per India Online Gaming Rules 2026 (per existing code comments).

7. **API response shape**: POST /orders returns both `order` (DB record) and `razorpayCheckout` (orderId, amount, currency, keyId) so frontend can call Razorpay.js checkout SDK.

8. **Admin UI pattern**: Payment settings page follows existing ServerSettingsPanel pattern: server-side auth guard + client component with form state. Credentials masked on GET (show only last 4 chars of keyId, booleans for others).

---

## Testing Strategy

Since the project has no test framework set up (tests/ directory is empty), verification relies on:

1. **Type checking**: `pnpm --filter <package> type-check` after each module change
2. **Build verification**: `pnpm build` after completing all changes
3. **Manual smoke test**: Follow step 15 to test the full flow with Razorpay test credentials
4. **Database inspection**: Query OrganizerPaymentConfig, Order, Registration tables to verify data correctness
5. **Webhook testing**: Use Razorpay dashboard webhook test tool or `curl` to POST test events

---

## Rollout Plan

1. **Development**: Implement steps 1-14 in dev environment (local or staging)
2. **Manual testing**: Step 15 smoke test with Razorpay test mode keys
3. **Legal review**: Confirm compliance with India Online Gaming Rules 2026 before enabling in production
4. **Production deploy**:
   - Run migration: `pnpm db:migrate` (or `pnpm --filter @esports/database exec prisma migrate deploy` on Vercel)
   - Set env vars in Vercel: `PAYMENTS_ENABLED=true`, `ENCRYPTION_KEY=<64-char-hex>`
   - Redeploy web app
5. **Organizer onboarding**: Instruct tournament organizers to configure Razorpay credentials via admin panel
6. **Monitor**: Check webhook success rate in Razorpay dashboard, review error logs in Developer Dashboard

---

## Security Considerations

- **Credential storage**: Encrypted at rest with AES-256-GCM. ENCRYPTION_KEY must be kept secret and rotated periodically.
- **Webhook signature**: Always verify before processing payment events. Timing-safe comparison prevents timing attacks.
- **Tenant isolation**: All queries scoped by guildId. Payment config FK on Tournament enforces organizer owns the config.
- **Admin-only access**: Payment config CRUD routes require SERVER_ADMIN role.
- **No client-side secrets**: Key Secret and Webhook Secret never sent to browser. Only Key ID (public) sent for Razorpay checkout.
- **Error messages**: Generic errors in API responses to avoid leaking internal details.

---

## Migration Safety

The new `OrganizerPaymentConfig` model and `Tournament.paymentConfigId` FK are both nullable/optional, so existing data is unaffected. No data migration needed. After deployment, organizers opt-in by configuring credentials.

---

## Future Enhancements (Out of Scope)

- Multiple payment providers per server (Stripe, PayPal)
- Automatic credential verification (test API call on save)
- Webhook event retry logic (idempotency already implemented)
- Payment analytics dashboard (total revenue, success rate)
- Refund workflow UI (Refund model exists, needs UI)
- Split payments (platform fee + organizer payout)

---

## Dependencies Added

- `razorpay` npm package (official Razorpay Node SDK) in `packages/payments/package.json`

## Environment Variables Added

- `ENCRYPTION_KEY`: 32-byte hex string (64 characters) for AES-256-GCM encryption
- `PAYMENTS_ENABLED`: Set to `true` to enable payment features (already exists, just set to true)

## Database Schema Changes

- New table: `organizer_payment_configs` (10 columns)
- Modified table: `tournaments` (added `payment_config_id` nullable FK)
- Modified table: `discord_servers` (added `paymentConfigs` relation)

## API Routes Added

- `POST /api/servers/[guildId]/payment-config` (create/update)
- `GET /api/servers/[guildId]/payment-config` (read masked)
- `DELETE /api/servers/[guildId]/payment-config` (delete)
- `POST /api/payments/webhooks/razorpay` (webhook handler)

## API Routes Modified

- `POST /api/servers/[guildId]/orders` (now returns razorpayCheckout object)

## Files Created

- `packages/payments/src/encryption.ts` (encrypt/decrypt functions)
- `packages/payments/src/razorpay.ts` (createRazorpayOrder, verifyPaymentSignature)
- `apps/web/src/app/api/servers/[guildId]/payment-config/route.ts` (CRUD handlers)
- `apps/web/src/app/api/payments/webhooks/razorpay/route.ts` (webhook handler)
- `apps/web/src/app/servers/[guildId]/admin/payment/page.tsx` (admin page)
- `apps/web/src/components/admin/PaymentConfigPanel.tsx` (admin form component)

## Files Modified

- `packages/database/prisma/schema.prisma` (added model + FK)
- `packages/payments/package.json` (added razorpay dependency)
- `packages/payments/src/index.ts` (export new modules)
- `packages/payments/src/orders.ts` (integrate Razorpay order creation)
- `packages/payments/src/webhooks.ts` (lookup by providerRef, verify organizer signature, respect autoApprove)
- `apps/web/src/app/api/servers/[guildId]/orders/route.ts` (return razorpayCheckout)
- `.env.local` (add ENCRYPTION_KEY, set PAYMENTS_ENABLED=true)
- Admin navigation component (add Payment Settings link)

---

**Total Estimated Effort**: 4-6 hours for implementation + 1-2 hours for testing and deployment.

**Complexity**: Medium. Involves schema changes, encryption, external API integration, webhook security, and admin UI.

**Risk**: Low. Changes are additive (no breaking changes to existing features). Payment module already feature-gated. Migrations are safe (nullable FK). Encryption key must be kept secret (store in Vercel env vars, never commit).
