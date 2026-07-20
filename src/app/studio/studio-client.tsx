"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CanvasHero,
  heroConfig,
  type HeroSettings,
} from "@/components/home/canvas-hero";
import { siteConfig, type SiteConfig } from "@/lib/site";

/* ------------------------------------------------------------------ types */
interface Draft {
  hero: HeroSettings;
  site: SiteConfig;
}
interface LogEntry {
  at: string;
  summary: string;
  changes: { field: string; from: unknown; to: unknown }[];
}

const DRAFT_KEY = "studio-draft-v1";
const KEY_KEY = "studio-key";

const defaults: Draft = { hero: heroConfig, site: siteConfig };

/* ------------------------------------------------------------- utilities */
function diff(before: Draft, after: Draft) {
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  const walk = (a: unknown, b: unknown, prefix: string) => {
    if (typeof a === "object" && a && typeof b === "object" && b) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys)
        walk(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
          prefix ? `${prefix}.${k}` : k,
        );
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push({ field: prefix, from: a, to: b });
    }
  };
  walk(before as unknown, after as unknown, "");
  return changes;
}

/* ---------------------------------------------------------------- fields */
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-xs text-muted">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="mt-2 w-full accent-[var(--accent)]"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
      />
    </label>
  );
}

/* ------------------------------------------------------------------ page */
export function StudioClient() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [draft, setDraft] = useState<Draft>(defaults);
  const [tab, setTab] = useState<"controls" | "log">("controls");
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  /* restore draft + key */
  useEffect(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) setDraft({ ...defaults, ...JSON.parse(d) });
      const k = sessionStorage.getItem(KEY_KEY);
      if (k !== null) {
        setKey(k);
        void tryAuth(k);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* persist draft locally so nothing is ever lost */
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const changes = useMemo(() => diff(defaults, draft), [draft]);
  const dirty = changes.length > 0;

  async function tryAuth(k: string) {
    setAuthErr("");
    const res = await fetch("/api/studio/log", {
      method: "POST",
      headers: { "x-studio-key": k },
    });
    if (res.ok) {
      const data = await res.json();
      setLog(data.log ?? []);
      sessionStorage.setItem(KEY_KEY, k);
      setAuthed(true);
    } else if (res.status === 501) {
      setAuthErr(
        "Studio isn't configured on the server yet (set STUDIO_PASSWORD + GITHUB_TOKEN in Vercel). Drafts still save locally.",
      );
      setAuthed(true); // allow local drafting
    } else {
      setAuthErr("Wrong password.");
    }
  }

  async function save() {
    setSaving(true);
    setStatus("");
    const summary =
      changes
        .slice(0, 3)
        .map((c) => c.field.split(".").slice(-1)[0])
        .join(", ") + (changes.length > 3 ? ` +${changes.length - 3} more` : "");
    try {
      const res = await fetch("/api/studio/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-studio-key": key,
        },
        body: JSON.stringify({
          files: [
            {
              path: "content/hero.json",
              content: JSON.stringify(draft.hero, null, 2) + "\n",
            },
            {
              path: "content/site.json",
              content: JSON.stringify(draft.site, null, 2) + "\n",
            },
          ],
          summary: `update ${summary}`,
          changes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(
          data.mode === "github"
            ? "Saved & committed — deploying, live in ~1 min."
            : "Saved to local files.",
        );
        void tryAuth(key); // refresh log
      } else if (res.status === 501) {
        setStatus(
          "Draft kept locally — connect STUDIO_PASSWORD + GITHUB_TOKEN in Vercel to make saves permanent.",
        );
      } else {
        setStatus(`Save failed: ${data.error} ${data.detail ?? ""}`);
      }
    } catch (e) {
      setStatus(`Save failed: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------- gate */
  if (!authed) {
    return (
      <div className="mx-auto grid min-h-[70svh] max-w-sm place-items-center px-6">
        <div className="w-full">
          <h1 className="font-display text-4xl">Studio</h1>
          <p className="mt-2 text-sm text-muted">
            Owner controls for this site.
          </p>
          <input
            type="password"
            value={key}
            placeholder="Password"
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryAuth(key)}
            className="mt-6 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
          />
          <button
            onClick={() => tryAuth(key)}
            className="mt-3 w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background"
          >
            Enter
          </button>
          {authErr && (
            <p className="mt-3 text-xs leading-relaxed text-muted">{authErr}</p>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ studio */
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Studio</h1>
          <p className="mt-1 text-sm text-muted">
            Edit, save, and every change is logged.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("controls")}
            className={`rounded-full px-4 py-2 text-sm ${tab === "controls" ? "bg-foreground text-background" : "border border-border"}`}
          >
            Controls
          </button>
          <button
            onClick={() => setTab("log")}
            className={`rounded-full px-4 py-2 text-sm ${tab === "log" ? "bg-foreground text-background" : "border border-border"}`}
          >
            Update log
          </button>
        </div>
      </div>

      {tab === "controls" ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          {/* Live preview */}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted">
              Live preview — hover &amp; hold
            </p>
            <div className="h-[420px] overflow-hidden rounded-xl border border-border">
              <CanvasHero compact overrides={draft.hero} />
            </div>
            {dirty && (
              <p className="mt-3 text-xs text-muted">
                {changes.length} unsaved change{changes.length > 1 ? "s" : ""} —
                drafts persist in this browser until saved.
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
                Hero — effect
              </h2>
              <Slider
                label="Pixel size"
                value={draft.hero.cell}
                min={12}
                max={48}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, cell: v } })
                }
              />
              <Slider
                label="Hover reveal radius"
                value={draft.hero.hoverRadius}
                min={60}
                max={300}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, hoverRadius: v } })
                }
              />
              <Slider
                label="Hold reveal radius"
                value={draft.hero.holdRadius}
                min={200}
                max={800}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, holdRadius: v } })
                }
              />
              <Slider
                label="Hold grow time (ms)"
                value={draft.hero.holdGrowMs}
                min={300}
                max={3000}
                step={50}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, holdGrowMs: v } })
                }
              />
              <Slider
                label="Trail persistence"
                value={draft.hero.decay}
                min={0.7}
                max={0.98}
                step={0.01}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, decay: v } })
                }
                hint="Higher = the reveal lingers longer."
              />
              <Slider
                label="Surface texture"
                value={draft.hero.textureStrength}
                min={0}
                max={2}
                step={0.1}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    hero: { ...draft.hero, textureStrength: v },
                  })
                }
              />
            </section>

            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
                Hero — text
              </h2>
              <TextField
                label="Headline"
                value={draft.hero.headline}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, headline: v } })
                }
              />
            </section>

            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
                Site
              </h2>
              <TextField
                label="Name"
                value={draft.site.name}
                onChange={(v) =>
                  setDraft({ ...draft, site: { ...draft.site, name: v } })
                }
              />
              <TextField
                label="Role"
                value={draft.site.role}
                onChange={(v) =>
                  setDraft({ ...draft, site: { ...draft.site, role: v } })
                }
              />
              <TextField
                label="Email"
                value={draft.site.email}
                onChange={(v) =>
                  setDraft({ ...draft, site: { ...draft.site, email: v } })
                }
              />
              {draft.site.socials.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                  <TextField
                    label={i === 0 ? "Social" : ""}
                    value={s.label}
                    onChange={(v) => {
                      const socials = [...draft.site.socials];
                      socials[i] = { ...socials[i], label: v };
                      setDraft({ ...draft, site: { ...draft.site, socials } });
                    }}
                  />
                  <TextField
                    label={i === 0 ? "URL" : ""}
                    value={s.href}
                    onChange={(v) => {
                      const socials = [...draft.site.socials];
                      socials[i] = { ...socials[i], href: v };
                      setDraft({ ...draft, site: { ...draft.site, socials } });
                    }}
                  />
                  <button
                    aria-label={`Remove ${s.label}`}
                    onClick={() => {
                      const socials = draft.site.socials.filter(
                        (_, j) => j !== i,
                      );
                      setDraft({ ...draft, site: { ...draft.site, socials } });
                    }}
                    className="self-end rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setDraft({
                    ...draft,
                    site: {
                      ...draft.site,
                      socials: [
                        ...draft.site.socials,
                        { label: "New", href: "https://" },
                      ],
                    },
                  })
                }
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
              >
                + Add social
              </button>
            </section>

            {/* Save bar */}
            <div className="sticky bottom-4 rounded-xl border border-border bg-background/90 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save & publish"}
                </button>
                <button
                  onClick={() => setDraft(defaults)}
                  disabled={!dirty || saving}
                  className="rounded-full border border-border px-4 py-2.5 text-sm disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
              {status && (
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {status}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------- log tab */
        <div className="mt-8">
          {log.length === 0 ? (
            <p className="text-sm text-muted">
              No studio updates logged yet. Every save lands here — and in the
              git history.
            </p>
          ) : (
            <ol className="space-y-4">
              {log.map((e, i) => (
                <li key={i} className="rounded-xl border border-border p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-sm font-medium">{e.summary}</p>
                    <p className="shrink-0 font-mono text-xs text-muted">
                      {new Date(e.at).toLocaleString()}
                    </p>
                  </div>
                  {e.changes?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {e.changes.map((c, j) => (
                        <li key={j} className="font-mono text-xs text-muted">
                          {c.field}: {JSON.stringify(c.from)} →{" "}
                          {JSON.stringify(c.to)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
