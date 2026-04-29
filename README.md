# CBSE Class XII Results 2026 — Prank Page

A frontend-only spoof of the CBSE Class XII results portal, redesigned as
"Results 2026". For entertainment only — no real data is sent or stored.

**Live demo:** https://cbse12-results-2026-daypsopt.devinapps.com

## How it works

1. The page mimics the old `cbseresults.nic.in` layout (teal header, blue
   accent text, simple form).
2. Filling and submitting the form triggers a 1.5s "Fetching your result..."
   spinner.
3. After the delay, a full-screen meme overlay appears with a zoom-in
   animation while `sound.mp3` plays at full volume on loop.
4. Clicking the overlay or pressing Esc hides the meme. The audio keeps
   playing until the tab is closed.

## Files

- `index.html` — markup, styles, and the prank UI script.
- `script.js` — ES module that posts every submission to the Supabase
  `results` table.
- `admin.html` / `admin.js` — password-protected admin page that lists
  submissions. Uses Supabase Auth; see "Admin panel" below.
- `cbse-logo.png` — header logo.
- `meme.jpg` — the reveal image. Replace with anything you like.
- `sound.mp3` — the reveal audio. Replace with anything you like.

## Tech

Plain HTML, CSS, and JavaScript. No build step, no framework. Supabase
is used as a hosted Postgres/Auth backend (loaded via CDN, no bundler).

## Customise

- Tweak `DRAMATIC_DELAY_MS` in the inline `<script>` to change the suspense.
- The colour palette is in `:root` CSS variables at the top of the file.
- Responsive breakpoints kick in below 720px and 380px for mobile/Android.

## Supabase schema

The `public.results` table needs the following columns (plus the
default `id` / `created_at` that Supabase auto-adds):

| column   | type   | notes                                  |
| -------- | ------ | -------------------------------------- |
| `roll`   | `text` | Roll number from the form.             |
| `school` | `text` | School number from the form.           |
| `admit`  | `text` | Admit-card ID from the form.           |
| `dob`    | `date` | Date of birth (HTML `<input type=date>`). |

To add `dob` to an existing table, run this once in the SQL editor:

```sql
alter table public.results add column if not exists dob date;
```

## Admin panel

Open `admin.html` (e.g. `/admin.html` on the deployed site) and sign in
with a Supabase Auth user to view submissions. Required one-time setup
in the Supabase dashboard:

1. **Create an admin user.** Authentication → Users → *Add user* →
   *Create new user* with an email and password. Tick "Auto confirm"
   so the account is usable immediately.
2. **Allow that user to read `public.results`.** In the SQL editor:
   ```sql
   alter table public.results enable row level security;

   -- anon still needs to INSERT (the prank form posts unauthenticated).
   drop policy if exists "anon can insert results" on public.results;
   create policy "anon can insert results"
     on public.results
     for insert
     to anon, authenticated
     with check (true);

   -- authenticated users (the admin) can SELECT.
   drop policy if exists "authenticated can read results" on public.results;
   create policy "authenticated can read results"
     on public.results
     for select
     to authenticated
     using (true);
   ```

The admin page never uses the service-role key, so it is safe to host
statically.

## Disclaimer

Not affiliated with the Central Board of Secondary Education or the
National Informatics Centre. This is a parody page.
