# Store apps in Capacitor shells

Echos should reach the App Store and Google Play, where students look for chant apps. The web app stays the one code base: Capacitor puts the same built `dist/` inside a native shell for iPhone (`ios/`) and Android (`android/`), and the site on GitHub Pages keeps running from it too.

Rewriting for React Native or Flutter, or writing Swift and Kotlin apps, was set aside: each throws away a working interface and its tests for gains Echos may not need. If the web view's audio falls short on a phone (latency, the screen locked), only the `AudioOutput` seam gets a native implementation; the rest stays shared.

What the shells add over the web app:

- **iPhone.** The audio session plays as a music app does (`.playback`), with the `audio` background mode, so the Ison is meant to keep sounding through the silent switch and with the screen locked. This is the first thing to check on a real phone.
- **Both.** Every file ships inside the app, so the store apps skip the service worker.

The app id `io.github.kartaiev.echos` becomes permanent with the first store release. The config is JSON (`capacitor.config.json`) because the Capacitor CLI cannot load a TypeScript config with TypeScript 7.

`.github/workflows/native.yml` builds both shells on every pull request: the iPhone app in a simulator, with a screenshot, and an Android debug APK.
