# Design notes

## Subject

A shopkeeper at a counter in India. Phone in one hand, held up for the customer
to scan. Shop lighting or daylight. The same four taps, three hundred times a
day. The app's job: turn one amount into stubs, hold each one up, stop.

## The idea: a machine that issues paper

Indian retail already has both objects this app needs — the **card terminal**
you punch an amount into, and the **bill book** you tear a stub out of. So:

**The app is the machine. The stubs are the paper it issues.**

Everything that is chrome — the amount display, the keys, the status rail — is
one dark navy body. The only bright surfaces in the whole app are the stubs and
the memo. The thing the customer is asked to look at is the only thing that
glows, and it is unmistakably a piece of paper because it is torn along the top
and the bottom.

That metaphor also carries the rule the app exists to respect: **the bill stays
whole, only the payment tears.** A stub is a payment leg. It carries the memo's
number and its own position (`INV1042 2/4`). The bill is never divided —
splitting invoices to hide turnover is tax evasion, and the design makes it
visually obvious that is not what is happening here.

## Color

Six values, each with one job.

| token       | value     | role                                        |
|-------------|-----------|---------------------------------------------|
| `machine`   | `#0e1526` | the body. Every chrome surface sits on it   |
| `raised`    | `#18213a` | keys, standing proud of the body            |
| `recessed`  | `#080d1a` | the display panel, sunk into it             |
| `paper`     | `#fcfbf7` | stubs and memos. The only bright surface    |
| `cyan`      | `#3fb6e0` | ruling and serial numbers, as in a bill book |
| `brass`     | `#e9b44c` | the one key that commits                    |
| `magenta`   | `#ff4d8d` | money kept                                   |
| `violet`    | `#6d3bc4` | the PAID stamp — ink, so it only ever appears on paper |

Brass for the commit key because a till is brass and because it is the one
colour on screen that nothing else uses. Magenta for savings because green is
the generic success colour and says nothing. Violet only ever lands on paper,
never on chrome, because it is a rubber stamp.

There is no light mode. One look in every light: dark chrome is legible in sun,
and the paper is bright where it needs to be.

## Type

Two families, split the way the app is split.

**The machine speaks in Space Grotesk.** A technical grotesque with slightly
odd, engineered letterforms and excellent tabular figures — it reads as a
readout rather than as an interface font. Labels, keys, buttons, and the lit
amount are all set in it.

**The paper is set in Fraunces.** A ledger serif, run with `SOFT` and `WONK`
turned up so it has the slight wobble of something printed rather than
rendered, and `opsz` left automatic so the big stub totals get proper display
contrast. Every stub amount, memo number and receipt figure is in it.

That split is the whole system in one decision: you can tell, without reading a
word, whether you are looking at the machine or at what it printed. A system
monospace appears in exactly one place — the UPI reference strings, which are
machine codes and nothing else.

## Layout

```
┌──────────────────────────┐   ┌──────────────────────────┐
│ Counter      Ledger  Set │   │ Counter     Ledger   Set │
│ ┌──────────────────────┐ │   │ ┌──────────────────────┐ │
│ │ Memo 1042    4 stubs │ │   │ │ Memo 1042     ₹7,300 │ │
│ │  ₹ 7,300             │ │   │ │ ▓▓▓▓▓░░░░░░░░░░░░░░░ │ │
│ │ ──────────────────── │ │   │ │ [1][2][3][4] ₹5,300  │ │
│ │ ₹29.20 kept  ₹7.30/scan│ │   │ └──────────────────────┘ │
│ │ Divide [2,000s][evenly]│ │   │ ╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲  │
│ └──────────────────────┘ │   │ │ Stub 2 of 4   ₹2,000 │ │
│  ┌────┐┌────┐┌────┐      │   │ │                      │ │
│  │ 7  ││ 8  ││ 9  │      │   │ │      [   QR   ]      │ │
│  └────┘└────┘└────┘      │   │ │                      │ │
│  ... 4 rows of keys ...  │   │ │ 7K3Q202   INV1042 2/4│ │
│ ┌──────────────────────┐ │   │ ╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱  │
│ │  Tear into 4 stubs   │ │   │ ┌──────────────────────┐ │
│ └──────────────────────┘ │   │ │  Mark stub 2 paid    │ │
└──────────────────────────┘   └──────────────────────────┘
```

On the counter screen the machine is a fixed-size object centred on the screen,
not a panel and keys stretched to fill a tall phone. On the deck the stub takes
every pixel that is left and the code grows with it, because that screen has one
job and it is being read from across a counter.

Left-aligned throughout. The code is the only centred thing.

## Motion

Motion here is feedback, not decoration. Every piece of it answers something the
merchant or the customer just did, or reports something the app is waiting on.

- **Digits drop in.** Each character of the readout is keyed on its own value,
  so only the characters that actually changed animate. Typing into `1,234`
  moves the digits that moved — which is what a mechanical readout does.
- **The saving travels.** The magenta figure eases to its new value instead of
  snapping, so a keypress reads as moving the number rather than replacing it.
- **Keys depress.** 2px of travel, a shortened lip and a brightness lift. It is
  the only feedback a glass keypad can give.
- **The code breathes.** A slow cyan ring pulses around the live stub's code:
  this is the one waiting to be scanned.
- **Light runs along the rail** while a memo is still open, and stops when it
  settles.
- **The tear.** A stub is stamped PAID, the paper recoils under the stamp, and
  the stub lifts off and away while the next feeds up out of the book. This is
  the one moment the app makes a show of, because it is the one that means a
  payment landed.
- **Screens arrive** in a short stagger — panel, keys, commit key — rather than
  appearing all at once.

All of it is cut by `prefers-reduced-motion`.

## Principles

1. The bill stays whole; only the payment tears.
2. Chrome is the machine; paper is the message. Nothing bright that is not paper.
3. Only money and codes get size.
4. Say the true thing. Under ₹1 lakh a month the app tells the merchant that no
   MDR applies and splitting is not needed.
5. The bottom third belongs to the hand.

## Rejected

- The first attempt: cream paper everywhere, hairline borders, floating cards.
  It read as a wireframe — no weight, no density, and the bill-book idea never
  landed because it was carried by one faint dotted line.
- Cream + serif + terracotta; near-black + acid green; the rounded-card SaaS kit.
- Green for savings, a progress ring, all-caps labels, `→` on buttons.
- `·` as a decimal separator, and `A · B · C` meta strings.
- Paper stubs stacked under the live one. The torn edge already says the stub
  came out of something; the stack read as a rendering glitch.
- Archivo on one width axis for everything. It held the layout together but
  gave the paper and the machine the same voice, which wasted the one idea the
  design has.
