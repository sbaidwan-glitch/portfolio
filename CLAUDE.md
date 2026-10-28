# Samara Baidwan — portfolio site

Static site in `public/`, live at https://samarabaidwan.com. No build step: plain HTML,
one shared stylesheet (`public/assets/css/styles.css`), one script
(`public/assets/js/main.js`). Changes go through a branch and a pull request that
Samara reviews. Merging to `main` publishes automatically via GitHub Pages
(`.github/workflows/pages.yml`, which uploads `public/`). The old ClodHost server
(`/var/www/sbaidwan.clodhost.com`) may still pull `main` as a backup copy.

## Content rules (these override any request to "make it sound better")

- **Clinic project is under NDA-style limits.** Never write "surgical," name the specific
  LEDs, or give the wavelength ("far-red" or any nm value). Use only "fluorescence imaging"
  or "bioimaging platform." Never use "PATH Imaging" anywhere. Heading:
  "Engineering Clinic — Bioimaging Illumination Electronics", subtitle
  "Industry-Sponsored Project".
- **Only claim what Samara did.** E80: she designed the anemometer and wind vane; the
  photodiode subsystem was Felix's. Do not list buoyancy calculations or C++.
  UNSW: she improved data *visualization* in the lab's MATLAB pipeline; she did not build
  the analysis.
- **No padding stats.** Every number must be hers and meaningful (R² = 0.99, 14,000+
  samples, 700 mA, 4.7×). No counts like "2 sensors designed" or other teams' numbers.
- **Don't make the site about E80.** It was a sophomore course project; the wind panel
  in the hero is the only E80 nod on the homepage.
- Contact email on the site: samarabaidwan@gmail.com (the Mudd address expires 2028).
- Never invent quotes, interviews, results, or outcomes. Unfinished work says so.

## Design system: "Field Station"

- Dark navy by default; light theme via the toggle (`html[data-theme="light"]`), stored
  in `localStorage` under `theme`. Each page sets it in a tiny inline `<head>` script so
  there's no flash. All colors come from the tokens at the top of `styles.css`; don't
  hard-code colors in components.
- Type: Chivo (text, headings) and Chivo Mono (labels, dates, readouts).
- Accent orange for links and primary actions; sea-teal for secondary labels.
- No gradient washes, glass blur cards, background gears, emoji, or decorative motion.

## Accessibility (non-negotiable)

- Text contrast ≥ 4.5:1 in BOTH themes (check any new color in both).
- Real `<button>`/`<a>`; icon-only controls get `aria-label`; touch targets ≥ 44px.
- Everything works at 375px wide with no horizontal scroll.
- Respect `prefers-reduced-motion`: no spinning, no auto-playing video, no eased vane.
- Video/clip and network features must fail gracefully and say so.

## Live wind panel (homepage hero)

- `main.js` fetches current wind for Claremont, CA (34.0967, -117.7198) from Open-Meteo
  (free, no key; CC BY 4.0, so keep the "Weather data by Open-Meteo.com" credit).
- Cached in `sessionStorage` for 10 min; refreshed every 15 min only while the tab is
  visible; 6 s timeout. On failure the panel says "Offline" and stays usable by cursor.
- Wind direction is meteorological (where wind comes FROM); the vane arrow points into
  the wind, so its rotation equals the reported direction.

## Domain

samarabaidwan.com is registered at Cloudflare (renews yearly, ~$10) and points at GitHub
Pages (DNS only, not proxied). Canonical and `og:url` tags hard-code
`https://samarabaidwan.com`; new pages need the same. Site-root paths (`/assets/...`)
depend on being served from the domain root, so don't move the site under a subpath.

## Files not in git

`public/assets/docs/` PDFs other than the current resume are fine to commit. Never
commit resumes with old confidential wording.
