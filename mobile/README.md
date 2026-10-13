# Counter — native

The same till, as a React Native app on **Expo SDK 57**.

```bash
cd mobile
npm install
npx expo start            # scan with Expo Go, or press a / i
npx expo run:android      # development build, once native modules matter
npx tsc --noEmit && npx expo lint && npx expo-doctor
```

PIN is **7890**. Open Settings first and enter the UPI ID that collects —
nothing can be generated until it is there.

## The logic is shared, not re-written

`src/lib/mdr.ts`, `split.ts`, `money.ts` and `upi.ts` are **byte-identical** to
the web app's copies. The MDR rule, the splitting invariants, integer-paise
money and the UPI URI format are the parts that must not drift between the two
apps, so they are not re-implemented here.

```bash
# from the repo root — these must stay identical
for f in mdr split money upi; do diff lib/$f.ts mobile/src/lib/$f.ts; done
```

Two things had to change to make that possible, and both were changed on the
web side too so the file could stay the same:

- **`crypto.getRandomValues` does not exist in React Native.** It now sits
  behind `lib/random.ts`, which is the only file that differs: the web one uses
  the Web Crypto API, this one uses `expo-crypto`.
- **`Intl` lakh grouping is not dependable on Hermes.** `money.ts` now groups
  Indian-style by hand. Falling back to thousands grouping would have misstated
  every amount over a lakh, silently.

## What is different from the web app

| | Web | Native |
|---|---|---|
| Storage | IndexedDB | AsyncStorage |
| Codes | `qrcode` on a canvas | `react-native-qrcode-svg` |
| Routing | Next.js App Router | Expo Router, `src/app/` |
| Feedback | `navigator.vibrate` | `expo-haptics` |
| CSV out | Blob download | `expo-file-system` + share sheet |
| Lock scope | per browser session | per app launch |
| Torn edge | CSS mask | SVG teeth |

The ledger is on the device either way, and the two do not sync. A memo made on
the phone is not in the browser and vice versa.

## Verified

The exported web build was driven end to end: the lock refuses a wrong PIN and
opens on 7890, settings persist, ₹7,300 splits into four stubs reporting ₹29.20
kept, each stub tears, the memo and ledger reconcile.

The code on the stub was **decoded from the rendered pixels** rather than
assumed:

```
upi://pay?pa=testshop%40okhdfcbank&pn=Verma%20Electronics
         &am=2000.00&cu=INR&tn=INV1001%201%2F4&tr=H9NY6601
```

Spaces as `%20` and not `+`, two-decimal amount, the note carrying the memo and
the leg's position, and the reference matching the one printed on the stub.

Still unverified, here as on the web: **nobody has scanned one of these with a
real UPI app.** Do that with a ₹1 stub before taking real money, and confirm the
collecting VPA is a merchant ID — on a personal one there is no MDR to avoid.

## Notes

- `src/app/` holds routes only; everything else lives beside it. Screens carry a
  `testID` so a test can scope to the screen on top, since the router keeps
  earlier ones mounted underneath.
- `ios/` and `android/` are generated. Configure native behaviour in `app.json`,
  never by editing those folders.
- Expo Go covers the modules used here. A development build is only needed if a
  library with native code is added later.
