# Life Tech SG — Landing Page

Static landing page for Life Tech SG smart home packages, built from the
"Life Tech SG — Offerings & Landing Page Content" plan (StoryBrand structure).

## Structure

- `index.html` — main landing page: hero, problem/guide sections, how it works,
  package tiers, pricing by home size (3-room / 4-room / 5-room / bigger, tabbed),
  LINE8 add-ons, FAQ accordion, blog cards, contact & opening hours.
- `blog/` — five long-form guide articles that back the FAQ answers.
- `css/style.css` — all styles (responsive, mobile nav, tabs, accordion).
- `js/main.js` — pricing tabs and mobile nav toggle.

## Running locally

No build step for the static site. Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8080
```

## Deploying to Vercel (recommended)

The site is static except for one serverless function, `api/lead.js`, which
emails the housing-specific No-Reno Smart Home Guide (from `assets/guides/`)
to each lead via [Resend](https://resend.com).

1. Import this repo into a Vercel project (framework preset: "Other", no build).
2. In **Project Settings → Environment Variables**, add:
   - `RESEND_API_KEY` (required) — your Resend API key. Never commit this to
     the repo; it lives only in Vercel.
   - `RESEND_FROM` (optional) — a verified sender, e.g.
     `Life Tech SG <guide@lifetechsg.com>`. Until your domain is verified in
     Resend, the function falls back to Resend's onboarding sender, which only
     delivers to your own Resend account email — verify the domain before
     going live.
   - `LEAD_NOTIFY_TO` (optional) — an address (e.g. `sales@lifetechsg.com`)
     that receives an internal notification for every new lead.
3. Deploy. The form posts to `/api/lead`; on static-only hosts (e.g. GitHub
   Pages) it degrades gracefully to a direct PDF download.

`vercel.json` bundles `assets/guides/**` into the function so the PDFs can be
attached to the emails.
