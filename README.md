ChezJalelPOS V60

V60 adds the Web Push client foundation for update notifications, while preserving V59 realtime server-to-gerant and update-check behavior. A VAPID public key and push sender backend are still required for true background/lock-screen update delivery.


## V61 — Web Push
V61 ajoute l’activation Web Push depuis l’écran Login. Le bouton demande la permission, crée l’abonnement Push et tente de l’enregistrer dans la table Supabase `push_subscriptions`.

### Supabase — table à créer une fois
```sql
create table if not exists public.push_subscriptions (
  id text primary key,
  restaurant_id text not null,
  device text,
  access_key text not null,
  subscription jsonb not null,
  updated_at timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions add column if not exists access_key text;
create policy "push select by chez key" on public.push_subscriptions for select using (access_key = (current_setting('request.headers', true)::json ->> 'x-chez-key'));
create policy "push insert by chez key" on public.push_subscriptions for insert with check (access_key = (current_setting('request.headers', true)::json ->> 'x-chez-key'));
create policy "push update by chez key" on public.push_subscriptions for update using (access_key = (current_setting('request.headers', true)::json ->> 'x-chez-key')) with check (access_key = (current_setting('request.headers', true)::json ->> 'x-chez-key'));
```
The VAPID private key is intentionally NOT included in the app. It must stay server-side for the push sender.
