"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PortraitHero,
  heroConfig,
  type HeroSettings,
} from "@/components/home/portrait-hero";
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

const DRAFT_KEY = "studio-draft-v3";
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

function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`mt-0.5 h-6 w-10 shrink-0 rounded-full border transition-colors ${
          value ? "border-foreground bg-foreground" : "border-border bg-transparent"
        }`}
      >
        <span
          className={`block size-4 rounded-full bg-background transition-transform ${
            value ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
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

  /* Restore draft + key. localStorage can't be read during render (it doesn't
     exist on the server), so hydrating from it in an effect is the correct
     pattern here despite the lint rule's general advice. */
  useEffect(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (d) setDraft({ ...defaults, ...JSON.parse(d) });
      const k = sessionStorage.getItem(KEY_KEY);
      if (k !== null) {

        setKey(k);
        void tryAuth(k);
      }
    } catch {}
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
              <PortraitHero compact overrides={draft.hero} />
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
                Hero — text
              </h2>
              <TextField
                label="Name"
                value={draft.hero.headline}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, headline: v } })
                }
              />
              <TextField
                label="Role line"
                value={draft.hero.role}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, role: v } })
                }
              />
              <TextField
                label="Tagline"
                value={draft.hero.sub}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, sub: v } })
                }
              />
            </section>

            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
                Hero — layout
              </h2>
              <Slider
                label="Portrait width"
                value={draft.hero.slotWidthFrac}
                min={0.3}
                max={0.7}
                step={0.02}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, slotWidthFrac: v } })
                }
                hint="Right-hand slot as a fraction of the hero."
              />
              <Slider
                label="Portrait scale"
                value={draft.hero.portraitScale}
                min={0.5}
                max={1.2}
                step={0.02}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, portraitScale: v } })
                }
              />
              <Slider
                label="Horizontal anchor"
                value={draft.hero.anchorX}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, anchorX: v } })
                }
              />
              <Slider
                label="Vertical anchor"
                value={draft.hero.anchorY}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, anchorY: v } })
                }
                hint="1 keeps the chin on a stable baseline."
              />
              <Slider
                label="Bottom bleed"
                value={draft.hero.bleedFrac}
                min={0}
                max={0.2}
                step={0.005}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, bleedFrac: v } })
                }
                hint="How much of the portrait sinks below the fold."
              />
            </section>

            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
                Hero — reveal
              </h2>
              <Slider
                label="Brush radius"
                value={draft.hero.brushRadius}
                min={40}
                max={400}
                step={5}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, brushRadius: v } })
                }
                hint="Size of the revealed area, css px."
              />
              <Slider
                label="Trail persistence"
                value={draft.hero.trailPersistence}
                min={0.5}
                max={0.98}
                step={0.01}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, trailPersistence: v } })
                }
                hint="Higher = the reveal lingers longer."
              />
              <Slider
                label="Threshold"
                value={draft.hero.threshold}
                min={0.05}
                max={0.9}
                step={0.01}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, threshold: v } })
                }
                hint="Lower = larger reveal."
              />
              <Slider
                label="Edge softness"
                value={draft.hero.edgeSoft}
                min={0.002}
                max={0.15}
                step={0.002}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, edgeSoft: v } })
                }
              />
            </section>

            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
                Hero — torn edge
              </h2>
              <Slider
                label="Tear scale"
                value={draft.hero.tearScale}
                min={1}
                max={20}
                step={0.5}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, tearScale: v } })
                }
                hint="Frequency of the big ragged tears."
              />
              <Slider
                label="Tear amount"
                value={draft.hero.tearAmp}
                min={0}
                max={0.25}
                step={0.005}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, tearAmp: v } })
                }
              />
              <Slider
                label="Tear drift"
                value={draft.hero.tearDrift}
                min={0}
                max={0.3}
                step={0.01}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, tearDrift: v } })
                }
                hint="Ambient crawl. 0 = perfectly still."
              />
              <Slider
                label="Crumb scale"
                value={draft.hero.crumbScale}
                min={8}
                max={120}
                step={2}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, crumbScale: v } })
                }
                hint="Fine crumble along the boundary."
              />
              <Slider
                label="Crumb amount"
                value={draft.hero.crumbAmp}
                min={0}
                max={0.4}
                step={0.01}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, crumbAmp: v } })
                }
              />
            </section>

            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
                Hero — pattern
              </h2>
              <Slider
                label="Resting opacity"
                value={draft.hero.patternOpacity}
                min={0}
                max={0.3}
                step={0.01}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, patternOpacity: v } })
                }
                hint="How present the guilloché is before hover."
              />
              <Slider
                label="Hover ink"
                value={draft.hero.patternHover}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, patternHover: v } })
                }
                hint="Pattern opacity inside the hover tear."
              />
              <Slider
                label="Strand density"
                value={draft.hero.patternSpacing}
                min={6}
                max={40}
                step={1}
                hint="Lower = more strands in the lace."
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, patternSpacing: v } })
                }
              />
              <Slider
                label="Drift speed"
                value={draft.hero.patternSpeed}
                min={0}
                max={0.6}
                step={0.01}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, patternSpeed: v } })
                }
                hint="Machined phase drift. 0 = perfectly still."
              />
              <Slider
                label="Loop depth"
                value={draft.hero.patternWobble}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, patternWobble: v } })
                }
                hint="How far the loops swing — deeper = bigger petals."
              />
              {/* "Clear zone" / "Edge reach" sliders removed with the centre
                  fade experiment — patternFadeIn/Out are inert while the
                  pattern rests paper-on-paper and runs edge-to-edge. */}
            </section>

            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
                Hero — datamosh
              </h2>
              <Slider
                label="Band height"
                value={draft.hero.bandPx}
                min={2}
                max={40}
                step={1}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, bandPx: v } })
                }
                hint="Smear band height, css px."
              />
              <Slider
                label="Band rate"
                value={draft.hero.bandRate}
                min={0}
                max={60}
                step={1}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, bandRate: v } })
                }
                hint="Re-rolls per second. 0 = frozen bands."
              />
              <Slider
                label="Band density"
                value={draft.hero.bandDensity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, bandDensity: v } })
                }
                hint="Fraction of bands that smear."
              />
              <Slider
                label="Smear distance"
                value={draft.hero.smearPx}
                min={0}
                max={200}
                step={2}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, smearPx: v } })
                }
              />
              <Slider
                label="Edge reach"
                value={draft.hero.edgeBand}
                min={0.02}
                max={0.5}
                step={0.01}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, edgeBand: v } })
                }
                hint="How far from the tear the smear reaches."
              />
              <Slider
                label="Mask smear"
                value={draft.hero.maskSmearMix}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, maskSmearMix: v } })
                }
                hint="Smears the boundary itself — makes the tabs."
              />
              <Slider
                label="RGB split"
                value={draft.hero.rgbSplitPx}
                min={0}
                max={24}
                step={1}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, rgbSplitPx: v } })
                }
              />
              <Slider
                label="Edge glow"
                value={draft.hero.edgeGlow}
                min={0}
                max={1}
                step={0.02}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, edgeGlow: v } })
                }
              />
            </section>

            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
                Hero — auto-scan
              </h2>
              <Toggle
                label="Auto-scan"
                value={draft.hero.autoScan}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, autoScan: v } })
                }
                hint="Drifts across the head when nobody is pointing."
              />
              <Toggle
                label="Auto-scan on desktop"
                value={draft.hero.autoScanDesktop}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, autoScanDesktop: v } })
                }
                hint="Off = touch devices only."
              />
              <Slider
                label="Scan speed"
                value={draft.hero.scanSpeed}
                min={0.2}
                max={3}
                step={0.1}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, scanSpeed: v } })
                }
              />
              <Slider
                label="Idle delay (ms)"
                value={draft.hero.idleMs}
                min={600}
                max={8000}
                step={100}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, idleMs: v } })
                }
                hint="How long after the cursor stops before auto-scan resumes."
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
