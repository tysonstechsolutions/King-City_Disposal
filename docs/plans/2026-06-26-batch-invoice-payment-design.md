# Batch Invoice Payment — Design

**Date:** 2026-06-26
**Goal:** Let an admin select several unpaid invoices for one customer and send a single link that pays them all at once.

## Approach

Do **not** create a new combined invoice record — that would double-count amounts in
Outstanding totals and accounting. Instead, add a lightweight **payment batch** that
references the existing invoices. The originals remain the source of truth; the batch is
a "pay these N together" wrapper. When the batch is paid, the webhook marks each
underlying invoice paid, so per-invoice records and Outstanding totals stay correct.

**Constraint:** a batch is for a single customer (one phone to text, one name on the
receipt). The admin UI enforces that selected invoices share a customer.

## Data model

New table `payment_batches` (run once in Supabase SQL Editor):

| column | type | notes |
|---|---|---|
| `id` | bigint identity PK | |
| `token` | text unique | random public id for the pay page (`/pay/<token>`) |
| `customer_name` | text | |
| `customer_phone` | text | |
| `customer_email` | text | |
| `invoice_ids` | jsonb | array of invoice IDs in the batch |
| `total_cents` | int | sum of balances at creation time |
| `status` | text | `pending` / `paid` / `void` |
| `stripe_session_id` | text | set when checkout completes |
| `created_at` | timestamptz | |
| `paid_at` | timestamptz | |

## Flow

1. **Admin invoices page** — "Select" toggle reveals checkboxes on unpaid rows. Selecting
   one customer greys out other customers' checkboxes (single-customer batch). A floating
   bar shows count + summed balance + "Create payment link".
2. **`POST /api/invoices/batch-pay`** (admin auth) — validates invoices are unpaid and
   share a customer, sums current balances, inserts a `payment_batches` row with a random
   token, texts the customer the `/pay/<token>` link, and returns `{ token, pay_url }` so
   the admin gets a copyable link + success dialog.
3. **`GET /api/payment-batches?token=...`** (public) — returns the batch plus its invoices
   (number, date, current balance, paid flag) for the pay page.
4. **`/pay/[token]`** (public page) — lists the invoices and a single **Pay $X Now**
   button. Recomputes live: invoices paid separately since the link was sent show a paid
   badge and are excluded from the total. If all are paid, shows a thank-you state.
5. **`POST /api/payment-batches/checkout`** (public) — re-reads the batch's invoices live,
   sums current balances (skips now-paid), creates one Stripe **Checkout Session** for the
   total with `metadata.type = 'invoice_batch'`, `batch_token`, and `invoice_ids`. Returns
   the Stripe URL.
6. **Webhook** (`checkout.session.completed`, new `type === 'invoice_batch'` branch) —
   marks the batch `paid` (idempotent via `stripe_session_id`); loops invoice IDs, marking
   each invoice `paid` with its own balance as `amount_paid_cents` and creating one
   transaction/receipt per invoice; sends **one** combined confirmation text to the
   customer and notifies the owner.

## Notes / decisions

- **No added card fee** — matches the existing single-invoice `pay` route, which charges
  `balance_due` as-is.
- **One transaction per invoice** — keeps each invoice's receipt and payments list
  accurate, even though the customer pays once.
- **Idempotency** — batch marked paid only if not already paid for that `stripe_session_id`;
  per-invoice updates already guard on current status.
- **Link durability** — the hosted `/pay/<token>` page never expires; a fresh Stripe
  Checkout session is created only when the customer clicks Pay.
