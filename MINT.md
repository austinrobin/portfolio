# MINT — build brief

> Handoff document. Everything needed to build Mint in a fresh session.
> Written 2026-08-13. Repo clean at `8d91044`; nothing for this project has been built yet.

---

## 1. What Mint is

A free, client-side browser **security-printing press**. You drop in a photo or logo, it becomes banknote engraving — line-engraved portrait, guilloché rosettes and borders, microtext, watermark, serial numbers — you tune the plate, hit "strike a new plate" for a happy accident, and export.

It is the first product in **The Lab**, the third chapter of Austin's portfolio. The Lab slot it fills is *"The Daily — the tab you keep open."*

**Decisions locked with Austin:**

| Decision | Value |
|---|---|
| Name | **Mint** |
| v1 scope | Security press only. Risograph press is v1.1, a third press v1.2 |
| Price | Free |
| Privacy | 100% client-side. Nothing is ever uploaded — this is part of the pitch |
| Route | `/lab/mint`, liftable to its own domain later |
| Shell | Dark UI (see §6) |

**Real jobs it serves:** fintech and crypto brand work, luxury and spirits packaging, event tickets, certificates and awards, membership cards, editorial illustration, merch.

---

## 2. Why this, and the taste brief

This matters more than the spec. An earlier round pitched four *process utilities* — a text-on-image contrast solver, a design-vs-build pixel differ, a copy stress-tester, a missing-states generator. All four were rejected: **"naah this is not that."**

Austin then sent seven reference sites: ascii-magic.com, ditther.com, backgrounds.supply, shedsgns.me/dungeon, paper-roll-nine.vercel.app, casebook-phi.vercel.app, vinyl-rho-peach.vercel.app. What they share:

- **Instruments, not utilities.** A real-time engine with tactile parameters — not a form that returns an answer.
- **Physical things made digital.** A printing roll you steer. A turntable you drag at 33⅓. An evidence board where you press `C` to string a thread. Vinyl's loading copy: *"Warming up the motor."* That's world-building, not a feature.
- **Serendipity over precision.** Shuffle / Remix / Inspire / Restyle. Ditther explicitly favours *"serendipity over manual parameter tweaking"* — one click to a beautiful accident you'd never dial in by hand.
- **You leave with an artifact.** Export is the payoff and the thing that gets posted.
- **Analog nostalgia.** Dither, halftone, CGA, LEGO, riso, print, vinyl.
- **Named like products, not features.** Ascii Magic. Ditther. Analogic. VX® Press Division. Blackwood Dossier.

So the target is **an instrument with soul that happens to do a real job**. Ditther *is* "the tab you keep open" — it earns that by being a joy, not by being worthy. Build Mint to that bar. If a decision is between *correct* and *characterful*, pick characterful.

One aside worth remembering: backgrounds.supply sells 1,273 static backgrounds for $49 lifetime. Designers pay real money for production-ready visual assets. A generative alternative is a live opportunity (that was the rejected "Loom" idea — parked, not dead).

**Why Mint specifically won:** nobody has built it on the web; it reuses an engine Austin has already shipped and debugged; and the portfolio argument is airtight — *the hero you just scrolled past is the product.*

---

## 3. What v1 does

**The loop:** drop an image → it becomes an engraving → tune the plate → strike a new plate → export.

**The plate**
- Photo → intaglio line engraving
- Guilloché rosettes, borders, and background lathe-work — parameterised
- Microtext bands — real text, legible only at export resolution
- Watermark / ghost portrait
- Single ink over paper stock; default `#101BBC` on `#F9F7F1`
- Serial number and plate number as first-class furniture

**Strike a new plate** — constrained randomisation across curated per-parameter ranges, never uniform noise. Every strike must be presentable. Locks so a good rosette survives a re-strike. This is the single most important interaction in the product; budget real time for tuning the ranges.

**Export** — PNG at 1×/2×/4K, plus SVG for the honestly-vectorisable layers.

---

## 4. The crown jewel: the engine already exists

`src/components/home/portrait-hero.tsx` (~1085 lines) contains a working **implicit spirograph guilloché generator in GLSL**. This is the expensive, already-debugged heart of a security press. Read it before writing anything.

The maths: a strand family is `ρ(θ) = r0 + A·sin(kθ + φᵢ)` with N strands whose phases spread over 2π. Rather than drawing N curves, it **inverts the family per fragment**: `u = (r − r0)/A`, and where `|u| ≤ 1` the strands passing through have `φ = asin(u) − kθ`, plus the `π − asin` branch. Distance to the nearest of the N phases draws **all strands at once, in O(1), with one `asin` per layer**. The two branches cross — that crossing is what produces the woven lens/petal lace of real banknote lathe-work. Strands widen where the family runs tangent (`w = wBase / (sqrt(1−u²) + 0.22)`), pooling ink at the petal cusps exactly like a geometric lathe.

Functions to lift, at `portrait-hero.tsx` §132–189:
- `guillocheR(px)` — p-norm (p=3) rounded-rect metric: rectangular presence, continuously curved corners
- `strandSet(u, phaseCoord, N, wBase)` — the solver above; both branches, tangent widening, envelope softening
- `guillocheLine(px)` — the 4-layer composition (two counter-phased border weaves on the rect metric with `atan(q.y, abs(q.x))` for left/right mirrored motion, two rotating rosette families)

Also lift the **WebGL1 hardening**, all of it earned the hard way:
- `getContext("webgl") ?? getContext("experimental-webgl")` with an `instanceof WebGLRenderingContext` guard
- Packed `vec4` uniforms — the WebGL1 spec minimum for `MAX_FRAGMENT_UNIFORM_VECTORS` is **16**
- `#ifdef GL_FRAGMENT_PRECISION_HIGH` precision guard
- Mediump-safe `hash21` (fract-chained; **never** `fract(sin(x)*43758)`, it bands on mediump)
- Never compute animation phase as `floor(uTime*rate)` in-shader — it freezes on mediump after ~2.5 min. Compute seeds on the CPU and wrap phase (the hero wraps at 40π so all drift rates stay seamless)
- DPR clamping, rAF with visibility + IntersectionObserver gating, idle throttle
- `webglcontextlost` / `webglcontextrestored` with a `glEpoch` bump
- **Cleanup deletes program/buffers/textures and never calls `loseContext()`** — calling it permanently kills the context on any re-run. This bug shipped once and downgraded the hero to its 2D fallback forever on the first slider tweak.
- Config read through a `cfgRef` inside the rAF loop (`portrait-hero.tsx:343-350`) so a slider drag never rebuilds the GL scene

`src/components/home/portrait-hero-2d.tsx` is the house pattern for a no-WebGL fallback component.

---

## 5. The engraving pass — the one genuinely unproven piece

Prototype this early; everything else is composition around it.

**What makes engraving read as *banknote* rather than generic halftone:**
1. Tone is carried by **line width**, not line density or dot size.
2. Lines **bend with the form** — they deflect around the subject rather than running straight through it.
3. **Cross-hatching appears only in the shadows**, at a second angle.
4. Highlights go **cleanly empty** — lines vanish entirely rather than fading grey.

**Recommended approach** (single fragment pass, output = ink coverage 0…1, then `mix(paper, ink, coverage)` for a true single-plate look):

```glsl
float L = lum(texture2D(uSrc, iuv).rgb);
// tone remap → ink amount
float t = 1.0 - clamp((L - black) / max(white - black, 0.001), 0.0, 1.0);
t = pow(t, gamma);

// the ruling, deflected by tone (this is the money move — lines follow form)
vec2  dir   = vec2(cos(angle), sin(angle));
float warp  = fbm(q * warpScale) - 0.5;
float coord = (dot(q, dir) + L * bulge + warp * warpAmt) * freq;
float r     = abs(fract(coord) - 0.5) * 2.0;      // 0 at line centre

// width modulated by tone
float w    = t * weight;
float line = 1.0 - smoothstep(w - aa, w + aa, r);

// cross-hatch, shadows only
float t2 = clamp((t - crossThresh) / max(1.0 - crossThresh, 0.001), 0.0, 1.0);
// ... same again on the perpendicular direction, width t2 * crossWeight
float ink = max(line, line2);
```

`L * bulge` is what sells it: the ruling coordinate is displaced by luminance, so lines swell and bend around the subject the way an engraver's burin follows the form.

**Antialiasing:** `fwidth` needs `OES_standard_derivatives` in WebGL1. Avoid the dependency — compute `aa` analytically from the ruling frequency and the plate's device-pixel height (`aa ≈ 1.5 * freq / halfHeightPx`). Work in **device px** throughout so this stays correct under DPR.

**Uniform budget** — pack to stay under 16 vectors. A workable layout:
`uRes`(vec2) · `uPlate`(vec4 rect) · `uImg`(vec4 cover-fit transform) · `uTone`(black, white, gamma, bulge) · `uEng`(freq, angle, weight, crossWeight) · `uEngB`(warpScale, warpAmt, crossThresh, hasImage) · `uRos`(strands, lobes, radius, depth) · `uRosB`(phase, thick, opacity, —) · `uBor`(strands, lobes, inset, depth) · `uBorB`(phase, thick, opacity, round) · `uMisc`(latheOpacity, latheScale, grain, vignette) · `uInk`(vec3) · `uPaper`(vec3) = **13 vectors**.

Use rect-normalised coords for the border (so it follows the plate's aspect) and y-normalised coords for the rosette (so it stays circular). `hasImage = 0` should render a guilloché-only plate — that's the empty state, and it should look good enough to be the landing visual.

**Microtext** is not solvable in this pass. Do it as a separate 2D-canvas text pass during composition, or a texture atlas. Be honest about it in the UI.

**SVG export**: the guilloché is generated from closed-form maths, so those layers *can* emit real vector paths by evaluating `ρ(θ)` on the CPU and sampling to polylines. The engraving pass is fundamentally raster (it's per-pixel tone lookup) — do not promise vector output for it. Say clearly in the UI which layers are vector.

---

## 6. Architecture

### Routing

```
src/app/lab/page.tsx                        /lab      — index, keeps site chrome
src/app/lab/(instrument)/layout.tsx         app shell for every instrument
src/app/lab/(instrument)/mint/page.tsx      /lab/mint — group elided from URL
```

The `(instrument)` group exists so the shell layout wraps the tools but **not** the `/lab` index. Adding the second tool is a folder drop.

**Rejected: `/lab/[slug]`.** Case studies are records rendered by one component; Lab products are applications. A dynamic route forces a slug→component map, worse code-splitting, and generated-rather-than-authored metadata.

**Rejected: a separate root layout.** Route groups alone do *not* escape the root layout — that needs multiple root layouts, which per the bundled docs requires deleting `src/app/layout.tsx` and moving `src/app/page.tsx` into a group (touching the locked homepage's path), and makes `/lab → /lab/mint` a **full page reload**. Not worth it to avoid two small edits.

**Suppressing site chrome** (Nav and Footer live in the root layout):
1. `src/lib/routes.ts` exporting `isInstrumentRoute(pathname)` → `/^\/lab\/[^/]+/`
2. `src/components/nav.tsx:14` — extend the existing early return. It already does `if (pathname === "/") return null;` for the banknote hero, so this is the established pattern.
3. Footer is a Server Component (and `new Date().getFullYear()` should stay server-side) — don't convert it. Wrap it in a small client `<ChromeGate>` that takes `children` and returns `null` on instrument routes.

With both gone, `<main className="flex-1">` inside `body.min-h-full.flex.flex-col` + `html.h-full` is already exactly the viewport.

### Next 16 gotchas that bite

Per `AGENTS.md`, **read `node_modules/next/dist/docs/` before writing code.** The ones that matter here:

- `params`/`searchParams` are **Promises**; sync access fully removed. (`/lab/mint` is static, so this is an argument *for* static routing.)
- `PageProps<"/route">` / `LayoutProps<"/route">` are **globally generated** types — no import. Already used at `src/app/work/[slug]/page.tsx:14`.
- **Turbopack is default for `dev` and `build`**; a webpack config now *fails* the build. Workers must use `new Worker(new URL("./x.ts", import.meta.url))`.
- **`useSearchParams` in a statically prerendered route without `<Suspense>` fails the production build.** This decides the permalink design → use the **hash**, not query params.
- `ssr: false` with `next/dynamic` throws in Server Components — import the instrument from inside a Client Component, or just mark it `"use client"`.
- OG image *functions* now receive `params`/`id` as Promises → another reason to ship a static PNG.
- Browser floor is Chrome/Edge/FF 111+, Safari 16.4+. Licenses `dvh` and `OffscreenCanvas`. **Does not** license `:has()` (Firefox shipped it in 121) — so no `body:has(...)` scroll lock; toggle a class on `documentElement` instead.
- React 19.2 gives you `useEffectEvent` (non-reactive reads in handlers) and `<Activity>` (keep a hidden press's state alive when switching presses).

### The dark shell — nearly free

`src/app/globals.css:21-33` uses `@theme inline`, so `--color-background` resolves to `var(--background)` **at the use site**. Redeclaring `--background`, `--foreground`, `--muted`, `--subtle`, `--border` inside `[data-shell="mint"]` flips every existing Tailwind utility (`bg-background`, `text-muted`, `border-border`) inside the shell — no new utilities, no variant, no fighting.

Put those overrides in the tool's own CSS, **not** `globals.css`, and do not re-enable the `.dark` variant that `globals.css` deliberately keeps inert.

**Why dark:** you cannot judge tonal output against warm `#F9F7F1` — it biases every highlight and shadow. This is functional, not fashion; it's why every darkroom-adjacent tool is dark. The brand still reads because the accent stays `#101BBC` and **the paper is what the press prints onto** — `PAPER` becomes the default substrate swatch in the panel. The site → instrument transition becomes a deliberate moment: walking into a darkroom.

### Layout

- **≥1024px:** `grid grid-cols-[1fr_320px] h-full`. Stage left, parameter rail right (`overflow-y-auto overscroll-contain`). Slim toolbar spanning both.
- **<768px: bottom sheet, not a side drawer.** A drawer occludes the image, which is fatal for a tool whose whole job is looking at the image. Three snap points (peek ≈96px / half ≈45dvh / full ≈88dvh) via `motion`'s `drag="y"` — already a dependency. At peek, the press selector + hero slider + Randomise stay visible *while you watch the canvas change*.
- `100dvh` not `100vh`. `overscroll-behavior: contain`. `touch-action: none` on slider thumbs or the page steals the drag.

### State

Follow `portrait-hero.tsx:343-350` literally:

```ts
const cfgRef = useRef(cfg);
useEffect(() => { cfgRef.current = cfg; wakeRef.current?.(); }, [cfg]);
```

- **`useReducer`, not `useState`** — randomise and preset-load mutate ~15 fields atomically. The action union (`set` / `randomise` / `reset` / `loadPreset` / `hydrateFromHash`) is also the natural basis for undo and for the permalink codec.
- One effect mirrors state into `paramsRef` and calls `invalidate()`. **Params never appear in any other effect's dependency array.**
- Engine is framework-free and imperative: `createPressEngine(canvas) → { setSource, invalidate, exportBlob, destroy }`, built once with `[]` deps.
- **Biggest perf lever:** render a downscaled preview fit to the stage during interaction (cap DPR at 2, 1.5 on touch — `portrait-hero.tsx:519` already does this); full resolution only on export. A 4000px source re-engraved per slider tick is the failure mode.
- Cap decoded source dimensions (~4096px longest edge) at load and say so in the UI, or mobile Safari will OOM.
- **No state library.** There are none in the repo; one page shouldn't add one.

**Permalinks:** yes, but hash-based (`#p=…`) and as an explicit "Copy link" action — never `router.replace` per slider tick. The image is never uploaded, so a permalink shares *a recipe*, not a result. Version the codec (`v1.`) with a compact base64url-packed array, not JSON. This doubles as the preset format.

### Liftability

Solved by code organisation, not routing. All tool code lives in `src/tools/mint/` with **zero imports from `@/lib/*` or `@/components/*`**; the files under `src/app/lab/` are thin adapters. Lifting = copy `src/tools/mint` + its public assets into a fresh app, add a permanent redirect, flip the registry entry's `href` and set `external: true`. Non-imported binary assets go through one `ASSET_BASE` constant.

This means duplicating ~90 lines of slider/toggle primitives from `studio-client.tsx:48-142` into the tool rather than extracting a shared module. That duplication is the correct price.

### Lab content model

`src/lib/lab.ts` — the flat-array shape of `showcase.ts` with the accessor discipline of `case-studies.ts:70-83`:

```ts
export type LabStatus = "live" | "building" | "planned";

export interface LabProduct {
  slug: string; name: string; tag: string;
  tagline: string; blurb: string;
  status: LabStatus; year: string;
  href?: string;        // undefined while planned — no dead links
  external?: boolean;   // true once lifted → <a>, not <Link>
  poster?: string;      // a REAL exported frame
  tech?: string[];      // ["Runs in your browser", "Nothing uploaded"]
  featured?: boolean; order?: number;
}
getLabProducts() / getLabProduct(slug) / getLabSlugs() / getLiveLabProducts()
```

`href` + `external` is the seam that makes the domain lift a one-line data change.

**Teaser rewrite** (`src/components/home/lab-teaser.tsx`): delete the hardcoded `experiments` array, read the registry. One full-width feature card for Mint on top (real exported poster, "Open the press →"), two coming-soon cards beneath in `sm:grid-cols-2`. **One real thing loudly, two promises quietly.** Status copy derived, not written. Non-live cards render as `<div>`, never `<Link>`. Keep the headline "Things I built that you can actually use." — it's now true, which is the whole point. Add a trailing `View the Lab →` matching `life-teaser.tsx:48-57`.

### SEO

- `title: { absolute: "..." }` to escape the `%s — Austin Robin` template — a standalone product shouldn't be titled as a portfolio page.
- **OG image: static PNG, not `ImageResponse`.** `ImageResponse` is satori — flexbox only, no canvas, no filters — so it physically cannot render the tool's output, which is the entire selling point. Export a real 1200×630 frame from the tool and commit it.
- `page.tsx` stays a Server Component: renders the client shell **plus** a static server-rendered section beneath — h1, what the presses do, how the engraving works, "runs entirely in your browser, nothing uploaded", a short FAQ. That's the crawlable body and it's genuinely useful copy.
- JSON-LD `SoftwareApplication` (`applicationCategory: "DesignApplication"`, price 0). Escape `<` as `<`.
- **`sitemap.ts` and `robots.ts` don't exist yet** — add them; a free standalone tool needs to be crawlable.

---

## 7. Build order

1. `src/lib/lab.ts` + `src/lib/routes.ts` — data and the routing predicate; everything reads them
2. Chrome suppression (`ChromeGate`, nav guard). **Verify `/lab/mint` renders bare with a stub page before any engine work**
3. Instrument layout + scoped dark tokens + scroll lock, proven with placeholder boxes
4. Stage + panel + bottom sheet against a fake schema and a solid-colour canvas — get responsive right before the engine exists
5. Engine + engraving pass, wired through the reducer and `paramsRef`. Preview resolution only
6. Plate composition — rosettes, borders, microtext, watermark, serial
7. Export — PNG at size, then the Worker; then SVG for the vector layers
8. Presets + "strike a new plate" range tuning (budget real time here)
9. Permalink codec
10. `/lab` index, teaser rewrite, `site.json` nav
11. Metadata, real OG frames, JSON-LD, sitemap, robots

---

## 8. Verification

- `npm run dev`, open `/lab/mint` in the browser pane at 1512×982
- Drop a test image — **confirm the engraving reads as banknote line work, not generic halftone**. This is the make-or-break judgement
- Drag every slider — no scene rebuild, no rAF stacking, no flicker
- Strike 20 plates — every result presentable, none noise
- Export at 4K and open it; export SVG and open it in a vector editor
- Kill the WebGL context in devtools — confirm fallback and restore
- Mobile Safari + a 10MP phone photo for memory and performance
- `npx tsc --noEmit` and `npx eslint` clean before every commit

---

## 9. Repo rules the next session must know

- **`AGENTS.md`: this is not the Next.js you know.** Read `node_modules/next/dist/docs/` before writing code.
- **Never run `npm run build` while the dev server is running** — it clobbers `.next` and the dev server then serves corrupted CSS. `npx tsc --noEmit` and `eslint` are safe.
- **The homepage hero and Select Works are LOCKED** (`checkpoint-01-banknote-hero`, commit `a8f5359`). Nothing above the Lab teaser in `src/app/page.tsx` gets touched without Austin's explicit say-so. The teaser and below are fair game.
- **Checkpoint workflow:** every state Austin approves gets git-tagged so it can be restored exactly. Ask before changing locked work.
- Palette is single-theme: paper `#F9F7F1`, ink `#101BBC`. Dark mode was removed deliberately.
- Austin decides by **reacting to real built UI**, not by choosing between abstract descriptions. Build a rough real thing and show it rather than presenting options in prose. (Two rounds of option-pitching were rejected before the reference sites unlocked this.)
- The organising principle for the whole site is **"intentional"** — nothing arbitrary, subtle interactions as craft signal, no huge-scale animation.
- Asset handover folder: `/Users/admin/Documents/Claude/Porftfolio/` (the typo is real).

---

## 10. Open items and risks

| Item | Note |
|---|---|
| **`siteConfig.url` is `https://example.com`** | Feeds `metadataBase`. Every absolute OG URL is broken until the real domain is bought. Blocks correct sharing |
| **Font licences** | Silk Sans Display and Peristiwa are trial/personal-use. A public free tool raises the stakes — have the instrument declare its own licensed fonts in `src/tools/mint/fonts.ts` and sidestep it |
| **Studio draft footgun** | `studio-client.tsx:162` does `setDraft({ ...defaults, ...JSON.parse(d) })` — a shallow merge. A stale `studio-draft-v3` localStorage entry replaces the whole `site` object, so a hand-added nav item can be silently reverted by the next Studio save. Bump the draft key when changing `site.json` |
| **Smooth-scroll regression** | `globals.css:40` sets `scroll-behavior: smooth`, but Next 16 no longer overrides it on navigation unless `<html data-scroll-behavior="smooth">`. Route changes currently animate instead of jumping. One-attribute fix, unrelated to Mint but live now |
| **Microtext** | Not solvable in the main fragment pass — needs a separate text pass |
| **SVG export** | Only the guilloché layers are honestly vectorisable. Don't promise vector for the engraving |
| **Mobile memory** | Large sources + full-res buffers will OOM mobile Safari. Cap decoded dimensions |
| Domain | mint.press / usemint.* undecided. v1 lives at `/lab/mint` |

---

## 11. Parked ideas

Rejected for now, but the reasoning is worth keeping:

- **Loom** — generative pattern studio (guilloché, moiré, weave, lattice → infinite tileable SVG/4K). Shares Mint's mathematical core, so it's nearly free once Mint exists. The generative answer to backgrounds.supply.
- **Overprint (risograph)** — already committed as Mint's v1.1 press: true 2–4 colour separations, ink library, misregistration, paper stock, overprint multiply, per-layer export for a real print run.
- **Emulsion** — film stock emulation. Most contested space; lowest differentiation.
- The four rejected utilities — Scrim (text-on-image contrast), Ghost (design vs build diff), Overflow (copy stress test), Afterstates (missing states). All solve real problems; none have the soul this slot needs. Ghost in particular may still be worth building later for the design-engineer argument.
