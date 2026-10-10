# Counter

Enter one amount at the till. Get back a set of UPI codes that each stay inside
the zero-MDR band, shown one at a time, ticked off as the customer pays.

## What this is actually working around

From **15 October 2026**, NPCI charges **0.4% MDR on person-to-merchant UPI
payments above ₹2,000**, capped at ₹300. Payments of ₹2,000 **and below** are
free, which is why ₹2,000 exactly is the largest stub this app will make.

Two things the headlines get wrong, and this app does not:

- **There is no GST on a UPI payment.** The 18% GST applies to the MDR *fee*,
  and a GST-registered merchant reclaims it as input tax credit. On a ₹7,300
  sale the real cost is about ₹29, not ₹1,300.
- **Splitting avoids a network fee, not a tax.** A ₹5,000 sale split three ways
  saves roughly ₹20.

### Before you rely on this

- **Check your UPI ID is a merchant one.** MDR only lands on merchant payments,
  and that is decided by the ID at your bank, not by the code this app draws. If
  the shop collects on a personal ID, there is nothing to avoid.
- **Under ₹1 lakh a month, you are already exempt.** The ledger screen tracks
  this and says so plainly when you are below the line.
- **Past about ₹75,000 the cap bites.** MDR stops at ₹300 however large the
  sale, so the scans keep coming while the saving does not. The app shows what
  each scan is worth and tells you when it has stopped being worth it.
- **Banks and NPCI have said they intend to spot the pattern.** Your merchant
  agreement, not the law, is what governs this. Worth reading first.

### One sale stays one memo

The app divides the **payment**, never the bill. Every stub carries the same
memo number in its UPI note (`INV1042 2/4`), so N rows on a bank statement trace
back to one taxable supply. Memo numbers are sequential and never reused, a
cancelled memo included, and the CSV export gives a CA one row per stub under a
sale-level subtotal.

Writing one large sale up as several smaller bills is a different thing
entirely, and this app will not do it.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npx vitest run       # the money and splitting rules
```

Open **Settings** first and enter the UPI ID that collects. Nothing can be
generated until it is there.

## How it is put together

| Path | What lives there |
|---|---|
| `lib/mdr.ts` | The rule — threshold, rate, cap, GST, exemption. Change it here and nowhere else. |
| `lib/split.ts` | `splitSale()`, both division modes, and the invariants that throw rather than reach the screen. |
| `lib/money.ts` | Integer paise, keypad entry, `en-IN` formatting, the UPI `am` value. |
| `lib/upi.ts` | The intent URI, references, notes, VPA validation. |
| `lib/store/` | `Repository` interface and an IndexedDB implementation. |
| `lib/providers/` | `PaymentProvider` interface, the manual provider, and the aggregator stub. |
| `app/` | Counter (`/`), deck (`/sale?id=`), memo (`/receipt?id=`), ledger, settings. |
| `public/sw.js` | The offline shell. |
| `DESIGN.md` | Why it looks like a torn bill book. |

**Money is integer paise everywhere.** The only decimals are in the display
formatters and the UPI `am` parameter.

**Two invariants** are asserted in `lib/split.ts` on every split: the legs add
up to the sale exactly, and no leg of a split sale is chargeable. Both throw.

### Confirming payments

Today the merchant ticks each stub off by hand while watching their own UPI app.
No aggregator, no onboarding, and nobody outside the shop sees the sale divided.

`lib/providers/types.ts` defines the seam for doing it automatically. A
Razorpay/Cashfree/PhonePe provider fills in `subscribe` and `verifyLeg` against
`app/api/webhooks/psp/route.ts`, which currently returns 501 rather than
pretending to accept payments. No screen changes when that lands — but note
that an aggregator then sees every leg of every sale, and its merchant
agreement is what governs whether splitting is acceptable.

### The counter lock

A PIN gates the app. It is **fixed in the build** — the constant in
`lib/auth.ts`, or `NEXT_PUBLIC_ADMIN_PIN` if that is set. The lock closes itself
after five minutes of no use and on every new browser session, and wrong guesses
back off to a five minute wait, so the keypad cannot be walked through every
combination by hand.

**Be clear about what this is.** It keeps someone who picks up the shop's phone
out of the till and the ledger — the threat that actually happens at a counter.
It is not access control. The PIN is compiled into the JavaScript the browser
downloads and is readable by anyone who looks, and the app has no server, so the
check runs on the same device as the person being checked.

If the address itself must refuse strangers, that has to be enforced before any
code is served. Two ways, neither of which is in place here:

```bash
# Vercel Authentication — only your Vercel account can open it. Means signing
# into Vercel in the phone's browser, which is awkward at a till.
vercel project protection set vercel-authentication --prod
```

Or a password checked in Next.js middleware against a server-only env var, which
needs no Vercel account and holds up because the rejection happens on the server
rather than in code the visitor controls.

### Where the data lives

On the device, in IndexedDB. Nothing is sent anywhere and nothing syncs to
another phone — a memo made on one handset is not on another. `lib/store/repository.ts`
is the seam for moving the ledger to a hosted database.

### On a phone

This is used one-handed at a till, so the phone case is the only case.

- **Nothing scrolls while taking a payment.** The keys, the commit bar and the
  lit readout size off `dvh`, so the till, deck and settled screens fit whole on
  a 360x640 Android as well as on a 412x915 Pixel. Only the memo scrolls, which
  it should — it is a document.
- **Every control answers a thumb**: 44px minimum. A hundred-thousand-rupee
  sale is fifty stubs, so the stub chips sit in a single row that scrolls
  sideways rather than wrapping into five rows and eating the screen.
- **Safe areas are respected** top and bottom, so the commit key clears the
  home indicator.
- **Pinch zoom is left on.** A reference or a memo line has to be readable by
  someone who needs it bigger.
- **First load is about 185 KB over the wire** (135 KB of JS with brotli, 40 KB
  of font, the rest markup and styles). The ledger serif is not preloaded
  because the till screen never prints anything, and the QR library is fetched
  on demand — it is the heaviest dependency and the till screen never draws a
  code. After the first load the service worker serves everything.
- **Motion rides on transform and opacity** so the compositor handles it
  without repainting, which matters on the cheap Android this will run on.

### Offline

Codes are generated on the device, so with the shell cached the whole flow —
enter, split, show, mark paid — works with no signal. The memo id travels in the
query string so one cached document per route serves every memo. Navigations are
network-first, so a deploy is picked up as soon as there is signal.

## Still to do before real money

- **Scan a generated code with a real UPI app** and confirm the amount prefills,
  is not editable, and the note and reference land on the statement. Do this
  with a ₹1 stub before anything else.
- Confirm with your bank whether same-day payments to one merchant are
  aggregated for MDR. If they are, the saving is not there.
