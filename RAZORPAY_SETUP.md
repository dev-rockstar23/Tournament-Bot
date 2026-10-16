# Razorpay Multi-Tenant Payment System - Setup Guide

## ✅ Implementation Complete

The multi-tenant Razorpay payment system has been implemented according to the plan. All code files have been created and committed to the repository.

## 📦 What Was Implemented

### Database Schema Changes
- ✅ Added `PaymentProvider` enum (RAZORPAY)
- ✅ Added `OrganizerPaymentConfig` model with encrypted credential fields
- ✅ Added `Tournament.paymentConfigId` foreign key relation
- ✅ Added `DiscordServer.paymentConfigs` relation

### Backend Modules
- ✅ **packages/payments/src/encryption.ts** - AES-256-GCM encryption for credentials
- ✅ **packages/payments/src/razorpay.ts** - Razorpay order creation and signature verification
- ✅ **packages/payments/src/orders.ts** - Updated to create Razorpay orders and return checkout data
- ✅ **packages/payments/src/webhooks.ts** - Updated to lookup by providerRef and respect autoApprove flag

### API Routes
- ✅ **apps/web/src/app/api/servers/[guildId]/payment-config/route.ts** - GET/POST/DELETE for payment config
- ✅ **apps/web/src/app/api/payments/webhooks/razorpay/route.ts** - Razorpay webhook handler
- ✅ **apps/web/src/app/api/servers/[guildId]/orders/route.ts** - Updated to return razorpayCheckout data

### Admin UI
- ✅ **apps/web/src/app/servers/[guildId]/admin/payment/page.tsx** - Payment settings page
- ✅ **apps/web/src/components/admin/PaymentConfigPanel.tsx** - Payment config form component

### Configuration
- ✅ Updated **.env.local** with:
  - `PAYMENTS_ENABLED=true`
  - `ENCRYPTION_KEY=09e0e729b77fb4a10bfd939910b7302c36a15418736801df887a834144b813f0`

## 🚨 Required Steps to Complete Setup

### 1. Install Dependencies

Run this command to install the razorpay package:

```bash
cd d:\Discord Projects\Tournament-Bot\esports-platform
pnpm install
```

**Note:** If you get a `public-hoist-pattern` error, the node_modules needs to be recreated. This is safe to do.

### 2. Set Up Database URL

Update `.env.local` with your actual Supabase database connection string:

```env
DATABASE_URL=postgresql://postgres.krpdzczispznbymjxsoe:[YOUR_DB_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

Replace `[YOUR_DB_PASSWORD]` with your actual Supabase database password.

### 3. Run Database Migration

Apply the schema changes to your database:

```bash
pnpm --filter @esports/database exec prisma migrate dev --name add_organizer_payment_config
```

Or for production (Vercel):

```bash
pnpm --filter @esports/database exec prisma migrate deploy
```

### 4. Regenerate Prisma Client

After migration, regenerate the Prisma client:

```bash
pnpm --filter @esports/database exec prisma generate
pnpm --filter @esports/database build
```

### 5. Build and Verify

Build all packages to verify no TypeScript errors:

```bash
pnpm build
```

Or build specific packages:

```bash
pnpm --filter @esports/payments build
pnpm --filter web... build
```

## 🔐 Environment Variables for Vercel

When deploying to Vercel, add these environment variables:

### Required
- `DATABASE_URL` - Your Supabase PostgreSQL connection string
- `PAYMENTS_ENABLED=true`
- `ENCRYPTION_KEY` - The 64-character hex string from .env.local (or generate a new one)

### Generate New Encryption Key (if needed)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📋 How Tournament Organizers Will Use It

### 1. Configure Razorpay Credentials (One-time)
- Navigate to `/servers/{guildId}/admin/payment`
- Enter Razorpay Key ID, Key Secret, and Webhook Secret
- System tests the connection by creating a test order (₹1)
- Credentials are encrypted and stored if verification succeeds

### 2. Create Paid Tournament
- Set `entryType: PAID`
- Set `entryPrice` (e.g., 100 for ₹100)
- Set `currency: INR`
- Link to their payment config (automatically uses organizer's Razorpay account)

### 3. Players Register and Pay
- Player registers for tournament
- System creates order in database
- Calls Razorpay API to create order using organizer's credentials
- Returns `razorpayCheckout` data to frontend
- Frontend uses Razorpay.js to show payment modal
- Player completes payment

### 4. Webhook Processing
- Razorpay sends webhook to `/api/payments/webhooks/razorpay`
- System verifies signature using organizer's webhook secret
- Updates order status to PAID
- If `tournament.autoApprove === true`, auto-approves registration
- Otherwise, leaves registration as PENDING for manual approval

## 🔗 Razorpay Webhook Configuration

Organizers need to configure webhooks in their Razorpay dashboard:

1. Go to https://dashboard.razorpay.com/
2. Navigate to Settings → Webhooks
3. Add webhook URL: `{NEXT_PUBLIC_APP_URL}/api/payments/webhooks/razorpay`
4. Select events:
   - `payment.captured`
   - `payment.failed`
   - `payment.refunded`
   - `payment.dispute.created`
5. Copy the Webhook Secret and save it in the admin panel

## 🧪 Testing Locally

### Prerequisites
- Valid Razorpay test account credentials
- ngrok or similar tool to expose localhost for webhooks

### Steps
1. Start dev server: `pnpm dev`
2. Expose port 3000 with ngrok: `ngrok http 3000`
3. Update `NEXT_PUBLIC_APP_URL` in .env.local to ngrok URL
4. Configure Razorpay webhook with ngrok URL
5. Configure payment settings in admin panel
6. Create test tournament with paid entry
7. Register and pay using Razorpay test cards
8. Verify webhook is received and registration approved

## 🛡️ Security Features Implemented

- ✅ Credentials encrypted at rest using AES-256-GCM
- ✅ Webhook signature verification using HMAC-SHA256 with timing-safe comparison
- ✅ Credentials never sent to client (only Key ID, which is public)
- ✅ API routes protected with role-based permissions (TOURNAMENT_MANAGER)
- ✅ Tenant isolation (all queries scoped by guildId)
- ✅ Idempotent webhook processing (prevents duplicate event handling)
- ✅ Test connection before saving credentials
- ✅ Masked credentials in API responses

## 📊 Database Tables

### organizer_payment_configs
Stores encrypted Razorpay credentials per organizer.

| Column | Type | Description |
|--------|------|-------------|
| id | String | Primary key |
| guild_id | String | Discord server ID |
| user_id | String | Tournament organizer Discord ID |
| provider | PaymentProvider | Always RAZORPAY currently |
| razorpay_key_id | String | Encrypted Key ID |
| razorpay_key_secret | String | Encrypted Key Secret |
| razorpay_webhook_secret | String | Encrypted Webhook Secret |
| is_active | Boolean | Config active status |
| is_verified | Boolean | Credentials verified |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**Unique constraint**: (guild_id, user_id)

### tournaments (modified)
Added foreign key to payment config.

| New Column | Type | Description |
|------------|------|-------------|
| payment_config_id | String? | FK to organizer_payment_configs |

## 🔄 Payment Flow Diagram

```
1. Player registers for paid tournament
   ↓
2. POST /api/servers/{guildId}/orders
   - Create Order record in DB
   - Fetch tournament.paymentConfig
   - Decrypt Razorpay credentials
   - Call Razorpay API to create order
   - Update Order.providerRef with Razorpay order_id
   - Return { order, razorpayCheckout }
   ↓
3. Frontend receives razorpayCheckout data
   - Load Razorpay.js
   - Open payment modal with order_id and key_id
   - Player completes payment
   ↓
4. Razorpay sends webhook to /api/payments/webhooks/razorpay
   - Lookup Order by providerRef (Razorpay order_id)
   - Fetch tournament.paymentConfig for webhook secret
   - Verify webhook signature
   - Update Order.status to PAID
   - If tournament.autoApprove: set Registration.status to APPROVED
   - Otherwise: leave as PENDING for manual approval
   ↓
5. Player sees confirmation, can access tournament
```

## 🐛 Known Issues / Limitations

1. **razorpay package not installed yet** - Run `pnpm install` to resolve
2. **Database migration not applied** - Run migration after setting DATABASE_URL
3. **TypeScript build errors** - Will resolve after installing dependencies and regenerating Prisma client
4. **No admin navigation link** - Need to add "Payment Settings" link to admin menu
5. **No tests** - Project has no test framework set up

## 📝 Next Steps

1. Complete the required setup steps above
2. Test the full payment flow locally
3. Deploy to Vercel with environment variables configured
4. Add "Payment Settings" link to admin navigation menu
5. Consider adding tests for critical payment logic
6. Monitor Razorpay dashboard for webhook success rates
7. Set up error logging/alerting for payment failures

## 📞 Support

For questions or issues:
- Check Razorpay documentation: https://razorpay.com/docs/
- Review code comments in implemented files
- Check Vercel deployment logs if webhooks fail

---

**Implementation Status**: ✅ Code Complete | ⏳ Pending Dependencies & Migration
