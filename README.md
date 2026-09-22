# ChezJalelPOS V53

- Menu preserved: 5 categories / 20 products.
- Cloud & Realtime remains connected through the saved device configuration.
- Realtime menu sync keeps the polling fallback.
- Added automatic update detection: every open installed device checks `app-version.json` every 30 seconds and shows a ChezJalelPOS update notice when a newer deployed version is available.
- Tapping "تحديث الآن" reloads the current app URL with a cache-busting query.
- For future releases, increment the version in `app-version.json` and `CJ_APP_VERSION` together.
- Publishable key only; never put a Secret/Service Role key in the app.
