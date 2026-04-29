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

- `index.html` — markup, styles, and script all in one file.
- `cbse-logo.png` — header logo.
- `meme.jpg` — the reveal image. Replace with anything you like.
- `sound.mp3` — the reveal audio. Replace with anything you like.

## Tech

Plain HTML, CSS, and JavaScript. No build step, no framework, no backend.

## Customise

- Tweak `DRAMATIC_DELAY_MS` in the inline `<script>` to change the suspense.
- The colour palette is in `:root` CSS variables at the top of the file.
- Responsive breakpoints kick in below 720px and 380px for mobile/Android.

## Disclaimer

Not affiliated with the Central Board of Secondary Education or the
National Informatics Centre. This is a parody page.
