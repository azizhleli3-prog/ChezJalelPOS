# ChezJalelPOS V51

- V50 menu preserved: 5 categories / 20 products.
- Cloud connection settings stay in the browser's local storage, so existing connected devices do not need to enter the credentials again after this update on the same app URL.
- Cloud & Realtime improved: Supabase Realtime subscription is kept, with a 2.5-second cloud polling fallback so browser-to-browser updates continue even when Postgres Changes/RLS does not deliver a realtime event.
- Local changes queue a cloud push and retry if another cloud operation is already running.
- The app still uses the Supabase Publishable key only; never put a Secret/Service Role key in the app.
