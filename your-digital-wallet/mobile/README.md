# GYDS Wallet — Mobile Wrapper

Three ways to ship the GYDS Wallet PWA as a native Android (or iOS) app.
The web app stays the source of truth — these wrappers just package it.

## Option A — Capacitor (recommended, full Android Studio project)

```bash
# 1. From the repo root, build the web app
bun install
bun run build

# 2. Inside this folder, install Capacitor
cd mobile
bun install

# 3. Add the Android platform (creates ./android/, open in Android Studio)
npx cap add android
npx cap copy
npx cap open android
```

Then in Android Studio: **Build → Generate Signed Bundle / APK** → AAB for Play Store.

`capacitor.config.ts` already points `webDir` to `../dist` so it picks up the
built PWA. To use the live published URL instead (no rebuild needed for
content updates), uncomment the `server.url` block in that file.

## Option B — Bubblewrap (Trusted Web Activity, smallest APK)

Requires the PWA to be deployed at a public HTTPS URL with a valid manifest.

```bash
npx @bubblewrap/cli init --manifest=https://YOUR-DOMAIN/manifest.webmanifest
npx @bubblewrap/cli build
```

A pre-filled `bubblewrap/twa-manifest.json` is included as a starting point —
edit `host`, `name`, and `signingKey` then run `bubblewrap update && bubblewrap build`.

## Option C — PWABuilder (no local toolchain)

1. Visit https://www.pwabuilder.com
2. Paste your published URL
3. Upload `pwabuilder.json` for pre-filled package settings
4. Download the Android (or iOS / Windows) package

## App identity

| Field | Value |
| --- | --- |
| App name | GYDS Wallet |
| Package | `io.netlifegy.gyds` |
| Theme | `#0f1318` |
| Background | `#0f1318` |
| Icons | `../public/pwa-192x192.png`, `../public/pwa-512x512.png` |

## Native push notifications

Background price alerts already work via the web service worker
(`public/alerts-sw.js`). For real OS-level push when the app is fully
killed, add `@capacitor/push-notifications` after `npx cap add android`
and wire FCM in Firebase. See `notes/push.md` for a step-by-step.
