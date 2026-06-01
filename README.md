# Portfolio

A personal design portfolio — Next.js (App Router) + TypeScript + Tailwind CSS v4 + Motion, with case studies and writing authored in MDX.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

> Requires Node 20+ (this repo was built on Node 26).

## Project structure

```
src/
  app/             # routes: /, /work, /work/[slug], /writing, /writing/[slug], /about, /contact
  components/      # nav, footer, theme toggle, motion primitives, work card
  content/
    work/          # case studies (.mdx, with frontmatter)
    writing/       # notes/blog (.mdx, with frontmatter)
  lib/
    site.ts        # name, role, socials, nav — EDIT THIS FIRST
    content.ts     # reads MDX frontmatter for listings
  mdx-components.tsx
```

## Editing content

- **Site identity:** edit `src/lib/site.ts` (name, role, email, socials, domain URL).
- **Add a case study:** create `src/content/work/<slug>.mdx` with frontmatter:
  ```yaml
  ---
  title: "Project title"
  summary: "One-line summary."
  year: "2025"
  role: "Lead Product Designer"
  client: "Company (or 'Confidential')"
  tags: ["Product", "Brand"]
  featured: true   # show first
  order: 1
  ---
  ```
- **Add a writing post:** create `src/content/writing/<slug>.mdx` with `title`, `summary`, `date`, `tags`.
- Images go in `public/` and are referenced as `/your-image.png` in MDX.

## Theming

Design tokens (colors, dark mode) live in `src/app/globals.css` under `:root` and `.dark`.
Fonts are configured in `src/app/layout.tsx`.

## Deploy to Vercel (free)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Vercel auto-detects Next.js — no config needed. Click **Deploy**.
4. Every push to `main` auto-deploys; pull requests get preview URLs.

### Custom domain

In the Vercel project: **Settings → Domains → Add**, then point your domain's DNS to the records Vercel shows. SSL is automatic. Finally, update `url` in `src/lib/site.ts` to your domain so metadata/OG tags are correct.
