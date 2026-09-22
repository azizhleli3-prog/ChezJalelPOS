# ChezJalelPOS V47

V47 adds the final local reliability layer on top of the existing POS:
- offline shell cache / PWA service worker
- offline status banner
- automatic cloud retry when internet returns
- safer cloud push check against a newer remote timestamp
- local JSON backup export/import
- existing login, roles, caisse, serveur, tickets, stock, salaries, dashboard and cloud/realtime prototype preserved

Important: direct Bluetooth thermal printing on iPhone still depends on printer/app support; browser print is retained. Production cloud should use proper Supabase Auth/RLS and structured tables before handling sensitive multi-device data.


V47: fixed Service Worker cache paths so offline app shell can install correctly on iPhone/Android PWA.
