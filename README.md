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

No build step. Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8080
```

Deployable as-is to any static host (Vercel, Netlify, GitHub Pages).
