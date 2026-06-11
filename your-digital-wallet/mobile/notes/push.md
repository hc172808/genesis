# Native push notifications (Android via Capacitor + FCM)

1. `cd mobile && bun install`
2. `npx cap add android`
3. Create a Firebase project, add an Android app with package `io.netlifegy.gyds`,
   download `google-services.json` and place it in `mobile/android/app/`.
4. In `mobile/android/build.gradle` add the Google services classpath and
   `apply plugin: 'com.google.gms.google-services'` in `android/app/build.gradle`.
5. In your web code (after Capacitor detection):

```ts
import { PushNotifications } from "@capacitor/push-notifications";
await PushNotifications.requestPermissions();
await PushNotifications.register();
PushNotifications.addListener("registration", (t) => {
  // POST t.value to your backend so your server can push via FCM
});
```

Until you wire a backend with FCM Server Key, the web service worker in
`public/alerts-sw.js` already polls in the background while the OS keeps it
alive — that covers the most common "alert me when the price hits X" flow.
