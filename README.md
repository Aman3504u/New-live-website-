# Peace Ghost

A dark, horror-themed landing page with a glassmorphism feedback form.
Pure black canvas, drifting red glow, abstract red ink splatters and
drips, glowing ghost-skull mark, and a wet-paint dripping headline.
The feedback form writes to a Supabase `feedbacks` table and also
keeps a local backup in `localStorage` so nothing is lost if the
network drops.

## Files

- `index.html` — Peace Ghost landing page. All CSS + JS inlined; no
  build step. Posts feedbacks to Supabase + alerts the user.
- `admin.html` / `admin.js` — password-protected admin page that
  lists submissions. Uses Supabase Auth; can switch between the
  `results` table (legacy CBSE prank) and the `feedbacks` table
  (Peace Ghost) via a dropdown. See "Admin panel" below.
- `script.js` — legacy ES module from the old CBSE prank page that
  posted submissions to the Supabase `results` table. Kept around
  in case the prank is restored.

## Tech

Plain HTML, CSS, and JavaScript. No build step, no framework.
Supabase is used as a hosted Postgres/Auth backend (loaded via CDN,
no bundler). A legacy optional FastAPI service in
[`backend/`](./backend) keeps an **anonymous** counter (single integer
+ timestamp, never the form values) — left over from the CBSE prank
page; not currently wired into the Peace Ghost landing.

## Supabase schema

### `feedbacks` table (used by `index.html`)

Run once in the SQL editor for project `lfdtxuzewghjyxyrhdua`:

```sql
create table if not exists public.feedbacks (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text        not null,
  feedback    text        not null
);

alter table public.feedbacks enable row level security;

-- anon (the public landing page) can INSERT.
drop policy if exists "anon can insert feedbacks" on public.feedbacks;
create policy "anon can insert feedbacks"
  on public.feedbacks
  for insert
  to anon, authenticated
  with check (true);

-- authenticated users (the admin) can SELECT.
drop policy if exists "authenticated can read feedbacks" on public.feedbacks;
create policy "authenticated can read feedbacks"
  on public.feedbacks
  for select
  to authenticated
  using (true);
```

Without this SQL the page still works — the form falls back to
`localStorage` and the user gets a "Saved offline" alert — but no
submissions land in the admin panel.

### Legacy `results` table (CBSE prank)

| column   | type   | notes                                     |
| -------- | ------ | ----------------------------------------- |
| `roll`   | `text` | Roll number from the form.                |
| `school` | `text` | School number from the form.              |
| `admit`  | `text` | Admit-card ID from the form.              |
| `dob`    | `date` | Date of birth (HTML `<input type=date>`). |

Plus the default `id` / `created_at` columns. The CBSE prank
landing page is no longer served at `/`, but the table remains and
the admin panel can still browse it.

## Admin panel

Open `admin.html` (e.g. `/admin.html` on the deployed site) and sign
in with a Supabase Auth user. The toolbar has a "Table" dropdown to
switch between **CBSE results** and **Peace Ghost feedbacks**.

One-time setup in the Supabase dashboard:

1. **Create an admin user.** Authentication → Users → *Add user* →
   *Create new user* with an email and password. Tick "Auto confirm"
   so the account is usable immediately.
2. **Allow that user to read both tables.** In the SQL editor (in
   addition to the `feedbacks` SQL above):
   ```sql
   alter table public.results enable row level security;

   drop policy if exists "anon can insert results" on public.results;
   create policy "anon can insert results"
     on public.results
     for insert
     to anon, authenticated
     with check (true);

   drop policy if exists "authenticated can read results" on public.results;
   create policy "authenticated can read results"
     on public.results
     for select
     to authenticated
     using (true);
   ```

The admin page never uses the service-role key, so it is safe to
host statically.

## Disclaimer

For entertainment only. The page does not represent any real
organisation. Feedback is humorous; "...apne G mein daal lena 😌"
is meant as a joke, not advice.
