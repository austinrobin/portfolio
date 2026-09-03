"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PortraitHero,
  heroConfig,
  type HeroSettings,
} from "@/components/home/portrait-hero";
import { siteConfig, type SiteConfig } from "@/lib/site";
import {
  caseStockbee,
  caseLwt,
  type CaseMedia,
  type CaseStudy,
} from "@/lib/case-studies";
import { LabTeaser } from "@/components/home/lab-teaser";
import {
  labConfig,
  type LabCascadeSettings,
} from "@/components/home/lab-config";
import { CurrentBuild } from "@/components/home/current-build";
import { ProjectDeck } from "@/components/home/project-deck";
import { LifeCollage } from "@/components/home/life-collage";
import { BanknoteFooter } from "@/components/home/banknote-footer";
import {
  footerConfig,
  type FooterSettings,
} from "@/components/home/footer-config";
import { CaseStudyView } from "@/components/case-study/case-study";
import { showcase } from "@/lib/showcase";

/* ------------------------------------------------------------------ types */
interface Draft {
  hero: HeroSettings;
  site: SiteConfig;
  caseStockbee: CaseStudy;
  caseLwt: CaseStudy;
  lab: LabCascadeSettings;
  footer: FooterSettings;
}
interface LogEntry {
  at: string;
  summary: string;
  changes: { field: string; from: unknown; to: unknown }[];
}

/** A media upload staged for the next save (kept in memory — not in the
    localStorage draft, base64 payloads would blow its quota). */
interface PendingMedia {
  path: string; // repo path, e.g. public/case/stockbee/engine-1712.webp
  base64: string;
  bytes: number;
}

const DRAFT_KEY = "studio-draft-v11"; // v11: footer script sizes are plate-relative (cqw), values converted
const KEY_KEY = "studio-key";

const defaults: Draft = {
  hero: heroConfig,
  site: siteConfig,
  caseStockbee,
  caseLwt,
  lab: labConfig,
  footer: footerConfig,
};

/* --------------------------------------------------- media upload helpers */

/** Downscale + re-encode an image to webp (jpeg fallback) so anything the
    Studio commits is display-sized and light. Returns base64 (no prefix). */
async function compressImage(
  file: File,
): Promise<{ base64: string; bytes: number; ext: string }> {
  const bitmap = await createImageBitmap(file);
  const encode = async (maxW: number, quality: number) => {
    const scale = Math.min(1, maxW / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/webp", quality),
    );
    return blob;
  };

  let blob = await encode(1920, 0.82);
  if (blob && blob.size > 1_500_000) blob = await encode(1600, 0.72);
  if (!blob) throw new Error("Could not encode the image.");
  if (blob.size > 2_000_000)
    throw new Error(
      `Still ${Math.round(blob.size / 1024)}KB after compression — hand this one to Claude to optimise.`,
    );

  const buf = await blob.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { base64: btoa(bin), bytes: blob.size, ext: "webp" };
}

async function readVideo(
  file: File,
): Promise<{ base64: string; bytes: number; ext: string }> {
  if (!/\.(mp4|webm)$/i.test(file.name))
    throw new Error("Videos must be .mp4 or .webm.");
  if (file.size > 8_000_000)
    throw new Error(
      `${Math.round(file.size / 1024 / 1024)}MB is too heavy for the site — hand it to Claude to compress first (target: under 8MB).`,
    );
  const buf = await file.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return {
    base64: btoa(bin),
    bytes: file.size,
    ext: file.name.toLowerCase().endsWith(".webm") ? "webm" : "mp4",
  };
}

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

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-foreground/40"
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

function Group({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/70">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {title}
        </span>
        <span
          className={`text-muted transition-transform ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      {open && <div className="space-y-4 pb-6 pt-1">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ page */
export function StudioClient() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [draft, setDraft] = useState<Draft>(defaults);
  const [tab, setTab] = useState<"controls" | "log">("controls");
  const [open, setOpen] = useState(true);
  const [group, setGroup] = useState<string | null>("Hero — text");
  const [target, setTarget] = useState<"home" | "case" | "case-lwt">("home");
  const caseKey = target === "case-lwt" ? ("caseLwt" as const) : ("caseStockbee" as const);
  const caseLabel = caseKey === "caseLwt" ? "LWT" : "StockBee";
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [mediaErr, setMediaErr] = useState("");

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
  const dirty = changes.length > 0 || pending.length > 0;

  const setLab = (patch: Partial<LabCascadeSettings>) =>
    setDraft({ ...draft, lab: { ...draft.lab, ...patch } });

  const setFooter = (patch: Partial<FooterSettings>) =>
    setDraft({ ...draft, footer: { ...draft.footer, ...patch } });

  /* -------------------------------------------- case-study edit helpers */
  const setCase = (patch: Partial<CaseStudy>) =>
    setDraft({ ...draft, [caseKey]: { ...draft[caseKey], ...patch } });

  const setSection = (
    si: number,
    patch: Partial<CaseStudy["sections"][number]>,
  ) => {
    const sections = [...draft[caseKey].sections];
    sections[si] = { ...sections[si], ...patch };
    setCase({ sections });
  };

  const setMedia = (si: number, mi: number, patch: Partial<CaseMedia>) => {
    const media = [...draft[caseKey].sections[si].media];
    media[mi] = { ...media[mi], ...patch };
    setSection(si, { media });
  };

  const moveMedia = (si: number, mi: number, dir: -1 | 1) => {
    const media = [...draft[caseKey].sections[si].media];
    const [m] = media.splice(mi, 1);
    media.splice(mi + dir, 0, m);
    setSection(si, { media });
  };

  const removeMedia = (si: number, mi: number) => {
    const gone = draft[caseKey].sections[si].media[mi];
    setSection(si, {
      media: draft[caseKey].sections[si].media.filter((_, j) => j !== mi),
    });
    // un-stage its upload if it never shipped
    if (gone?.src)
      setPending((p) =>
        p.filter((f) => `/${f.path.replace(/^public\//, "")}` !== gone.src),
      );
  };

  const setStat = (i: number, patch: Partial<{ value: string; label: string }>) => {
    const stats = [...draft[caseKey].impact.stats];
    stats[i] = { ...stats[i], ...patch };
    setCase({ impact: { ...draft[caseKey].impact, stats } });
  };

  const pendingBadge = (src: string) =>
    pending.some((f) => `/${f.path.replace(/^public\//, "")}` === src)
      ? " · staged"
      : "";

  async function addMedia(si: number, file: File) {
    setMediaErr("");
    try {
      const isVideo = file.type.startsWith("video/");
      const out = isVideo ? await readVideo(file) : await compressImage(file);
      const name = `${draft[caseKey].sections[si].id}-${Date.now()}.${out.ext}`;
      const repoPath = `public/case/${draft[caseKey].slug}/${name}`;
      setPending((p) => [
        ...p,
        { path: repoPath, base64: out.base64, bytes: out.bytes },
      ]);
      const media = [
        ...draft[caseKey].sections[si].media,
        {
          kind: isVideo ? ("video" as const) : ("image" as const),
          src: `/case/${draft[caseKey].slug}/${name}`,
          caption: "",
          aspect: "wide" as const,
        },
      ];
      setSection(si, { media });
      setStatus(
        `Staged ${name} at ${Math.round(out.bytes / 1024)}KB — lightweight ✓`,
      );
    } catch (e) {
      setMediaErr(e instanceof Error ? e.message : String(e));
    }
  }

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
            {
              path: "content/case-stockbee.json",
              content: JSON.stringify(draft.caseStockbee, null, 2) + "\n",
            },
            {
              path: "content/case-lwt.json",
              content: JSON.stringify(draft.caseLwt, null, 2) + "\n",
            },
            {
              path: "content/lab.json",
              content: JSON.stringify(draft.lab, null, 2) + "\n",
            },
            {
              path: "content/footer.json",
              content: JSON.stringify(draft.footer, null, 2) + "\n",
            },
            ...pending.map((m) => ({
              path: m.path,
              content: m.base64,
              encoding: "base64" as const,
            })),
          ],
          summary: `update ${summary}`,
          changes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPending([]); // media is committed — nothing staged any more
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
  const PANEL = 400;

  return (
    <>
      {/* ---- the actual site, live, underneath ---- */}
      <div
        className="transition-[padding] duration-300"
        style={{ paddingRight: open ? PANEL : 0 }}
      >
        {target === "home" ? (
          <>
            <PortraitHero overrides={draft.hero} />
            <CurrentBuild />
            <section id="work" className="scroll-mt-16">
              <h2 className="sr-only">Select Works</h2>
              <ProjectDeck items={showcase} />
            </section>
            <LabTeaser overrides={draft.lab} />
            <LifeCollage />
            <BanknoteFooter overrides={draft.footer} />
          </>
        ) : (
          <CaseStudyView cs={draft[caseKey]} />
        )}
      </div>

      {/* ---- collapsed handle ---- */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-[120] -translate-y-1/2 rounded-l-xl border border-r-0 border-border bg-background/95 px-3 py-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted shadow-lg backdrop-blur hover:text-foreground"
        >
          <span className="[writing-mode:vertical-rl]">Studio</span>
        </button>
      )}

      {/* ---- the panel ---- */}
      <aside
        className={`fixed right-0 top-0 z-[110] flex h-svh flex-col border-l border-border bg-background/95 shadow-2xl backdrop-blur transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: PANEL }}
      >
        {/* header */}
        <div className="shrink-0 border-b border-border px-5 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl leading-none">Studio</h1>
            <button
              onClick={() => setOpen(false)}
              aria-label="Collapse panel"
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
            >
              ›
            </button>
          </div>

          {/* what am I editing */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(
              [
                ["home", "Home"],
                ["case", "StockBee"],
                ["case-lwt", "LWT"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => {
                  setTarget(k);
                  setTab("controls");
                }}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  target === k && tab === "controls"
                    ? "bg-foreground text-background"
                    : "border border-border text-muted"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setTab(tab === "log" ? "controls" : "log")}
              className={`rounded-full px-3 py-1.5 text-xs ${
                tab === "log"
                  ? "bg-foreground text-background"
                  : "border border-border text-muted"
              }`}
            >
              Log
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5">
          {tab === "controls" ? (
            <div>
            <Group title={"Hero — text"} open={group === "Hero — text"} onToggle={() => setGroup(group === "Hero — text" ? null : "Hero — text")}>
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
            </Group>

            <Group title={"Hero — layout"} open={group === "Hero — layout"} onToggle={() => setGroup(group === "Hero — layout" ? null : "Hero — layout")}>
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
            </Group>

            <Group title={"Hero — reveal"} open={group === "Hero — reveal"} onToggle={() => setGroup(group === "Hero — reveal" ? null : "Hero — reveal")}>
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
            </Group>

            <Group title={"Hero — torn edge"} open={group === "Hero — torn edge"} onToggle={() => setGroup(group === "Hero — torn edge" ? null : "Hero — torn edge")}>
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
            </Group>

            <Group title={"Hero — pattern"} open={group === "Hero — pattern"} onToggle={() => setGroup(group === "Hero — pattern" ? null : "Hero — pattern")}>
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
              <Slider
                label="Clear zone"
                value={draft.hero.patternFadeIn}
                min={0.1}
                max={0.8}
                step={0.02}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, patternFadeIn: v } })
                }
                hint="Radius around the portrait kept pattern-free."
              />
              <Slider
                label="Edge reach"
                value={draft.hero.patternFadeOut}
                min={0.4}
                max={1.2}
                step={0.02}
                onChange={(v) =>
                  setDraft({ ...draft, hero: { ...draft.hero, patternFadeOut: v } })
                }
                hint="Where the pattern hits full strength."
              />
            </Group>

            <Group title={"Hero — datamosh"} open={group === "Hero — datamosh"} onToggle={() => setGroup(group === "Hero — datamosh" ? null : "Hero — datamosh")}>
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
            </Group>

            <Group title={"Hero — auto-scan"} open={group === "Hero — auto-scan"} onToggle={() => setGroup(group === "Hero — auto-scan" ? null : "Hero — auto-scan")}>
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
            </Group>

            <Group title={"Site"} open={group === "Site"} onToggle={() => setGroup(group === "Site" ? null : "Site")}>
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
            </Group>

            <Group title={"Lab — cascade"} open={group === "Lab — cascade"} onToggle={() => setGroup(group === "Lab — cascade" ? null : "Lab — cascade")}>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Placement
              </p>
              <Slider label="Cover width" value={draft.lab.paneWidth} min={28} max={64} step={1}
                onChange={(v) => setLab({ paneWidth: v })}
                hint="% of the stage each cover takes." />
              <Slider label="Cover shape" value={draft.lab.paneAspect} min={0.7} max={1.35} step={0.05}
                onChange={(v) => setLab({ paneAspect: v })}
                hint="Height ÷ width. 1 = square cover." />
              <Slider label="Step across" value={draft.lab.stepX} min={8} max={44} step={1}
                onChange={(v) => setLab({ stepX: v })}
                hint="How far each cover sits to the right of the last." />
              <Slider label="Step up" value={draft.lab.stepY} min={0} max={28} step={1}
                onChange={(v) => setLab({ stepY: v })}
                hint="How much the diagonal climbs per cover. 0 = flat row." />

              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Angle
              </p>
              <Slider label="Turn (Y)" value={draft.lab.rotY} min={-60} max={0} step={1}
                onChange={(v) => setLab({ rotY: v })}
                hint="The cover's standing angle. 0 = facing you." />
              <Slider label="Lean (X)" value={draft.lab.rotX} min={-20} max={20} step={1}
                onChange={(v) => setLab({ rotX: v })}
                hint="Backward/forward lean. 0 keeps verticals vertical." />
              <Slider label="Perspective" value={draft.lab.perspective} min={500} max={2600} step={50}
                onChange={(v) => setLab({ perspective: v })}
                hint="Camera distance — lower is more dramatic." />

              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Surface
              </p>
              <Slider label="Corner radius" value={draft.lab.radius} min={0} max={28} step={1}
                onChange={(v) => setLab({ radius: v })} />
              <Slider label="Shadow — rest" value={draft.lab.shadowRest} min={0} max={0.5} step={0.01}
                onChange={(v) => setLab({ shadowRest: v })} />
              <Slider label="Shadow — active" value={draft.lab.shadowHover} min={0} max={0.6} step={0.01}
                onChange={(v) => setLab({ shadowHover: v })} />

              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Active state
              </p>
              <Slider label="Slide out" value={draft.lab.slide} min={0} max={70} step={1}
                onChange={(v) => setLab({ slide: v })}
                hint="% of its own width the hovered cover slides right." />
              <Slider label="Scale" value={draft.lab.activeScale} min={1} max={1.3} step={0.01}
                onChange={(v) => setLab({ activeScale: v })} />
              <Slider label="Turn when active" value={draft.lab.activeRotY} min={-60} max={0} step={1}
                onChange={(v) => setLab({ activeRotY: v })}
                hint="Same as Turn (Y) = pure slide. 0 = faces you fully." />
            </Group>

            <Group title={"Footer — dedication"} open={group === "Footer — dedication"} onToggle={() => setGroup(group === "Footer — dedication" ? null : "Footer — dedication")}>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Plate
              </p>
              <Slider label="Plate height" value={draft.footer.plateHeight} min={45} max={85} step={1}
                onChange={(v) => setFooter({ plateHeight: v })}
                hint="Height as % of the plate's width." />
              <Toggle label="Guilloché ground" value={draft.footer.showGuilloche}
                onChange={(v) => setFooter({ showGuilloche: v })} />
              <Slider label="Guilloché strength" value={draft.footer.guillocheOpacity} min={0} max={2} step={0.05}
                onChange={(v) => setFooter({ guillocheOpacity: v })}
                hint="1 = the pattern as drawn; above 1 inks the lines darker." />

              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                Pegasi
              </p>
              <Slider label="Inset from edge" value={draft.footer.pegasusX} min={0} max={30} step={0.5}
                onChange={(v) => setFooter({ pegasusX: v })} />
              <Slider label="From top" value={draft.footer.pegasusY} min={0} max={40} step={0.5}
                onChange={(v) => setFooter({ pegasusY: v })} />
              <Slider label="Width" value={draft.footer.pegasusW} min={10} max={40} step={0.5}
                onChange={(v) => setFooter({ pegasusW: v })} />

              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                Austin lettering
              </p>
              <Slider label="From top" value={draft.footer.austinY} min={5} max={60} step={0.5}
                onChange={(v) => setFooter({ austinY: v })} />
              <Slider label="Width" value={draft.footer.austinW} min={30} max={90} step={1}
                onChange={(v) => setFooter({ austinW: v })} />

              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                Colonnades
              </p>
              <Slider label="Inset from edge" value={draft.footer.colonnadeX} min={0} max={25} step={0.5}
                onChange={(v) => setFooter({ colonnadeX: v })} />
              <Slider label="From bottom" value={draft.footer.colonnadeBottom} min={0} max={30} step={0.5}
                onChange={(v) => setFooter({ colonnadeBottom: v })} />
              <Slider label="Width" value={draft.footer.colonnadeW} min={8} max={35} step={0.5}
                onChange={(v) => setFooter({ colonnadeW: v })} />

              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                Flourishes
              </p>
              <Slider label="Inset from edge" value={draft.footer.flourishX} min={5} max={45} step={0.5}
                onChange={(v) => setFooter({ flourishX: v })} />
              <Slider label="From top" value={draft.footer.flourishY} min={20} max={80} step={0.5}
                onChange={(v) => setFooter({ flourishY: v })} />
              <Slider label="Width" value={draft.footer.flourishW} min={4} max={20} step={0.5}
                onChange={(v) => setFooter({ flourishW: v })} />

              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                Scripts
              </p>
              <TextField label="Verse (\n = line break)" value={draft.footer.verseText}
                onChange={(v) => setFooter({ verseText: v })} />
              <Slider label="Verse from top" value={draft.footer.verseY} min={30} max={80} step={0.5}
                onChange={(v) => setFooter({ verseY: v })} />
              <Slider label="Verse size" value={draft.footer.verseSize} min={1} max={7} step={0.1}
                onChange={(v) => setFooter({ verseSize: v })} hint="% of the plate width — identical in Studio and live." />
              <Slider label="Monogram from top" value={draft.footer.monogramY} min={55} max={95} step={0.5}
                onChange={(v) => setFooter({ monogramY: v })} />
              <Slider label="Monogram width" value={draft.footer.monogramW} min={2} max={12} step={0.25}
                onChange={(v) => setFooter({ monogramW: v })} />
              <TextField label="Dedication" value={draft.footer.dedicationText}
                onChange={(v) => setFooter({ dedicationText: v })} />
              <Slider label="Dedication from top" value={draft.footer.dedicationY} min={60} max={98} step={0.5}
                onChange={(v) => setFooter({ dedicationY: v })} />
              <Slider label="Dedication size" value={draft.footer.dedicationSize} min={0.7} max={4} step={0.05}
                onChange={(v) => setFooter({ dedicationSize: v })} />
            </Group>

            <Group title={`Case — ${caseLabel}`} open={group === `Case — ${caseLabel}`} onToggle={() => setGroup(group === `Case — ${caseLabel}` ? null : `Case — ${caseLabel}`)}>
              <TextArea
                label="Tagline"
                value={draft[caseKey].tagline}
                rows={2}
                onChange={(v) => setCase({ tagline: v })}
              />
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label="Team"
                  value={draft[caseKey].team}
                  onChange={(v) => setCase({ team: v })}
                />
                <TextField
                  label="Scope"
                  value={draft[caseKey].scope}
                  onChange={(v) => setCase({ scope: v })}
                />
              </div>

              {draft[caseKey].sections.map((s, si) => (
                <details
                  key={s.id}
                  className="rounded-xl border border-border p-4"
                >
                  <summary className="cursor-pointer text-sm font-medium">
                    {s.kicker}
                  </summary>
                  <div className="mt-4 space-y-3">
                    <TextField
                      label="Kicker"
                      value={s.kicker}
                      onChange={(v) => setSection(si, { kicker: v })}
                    />
                    <TextArea
                      label="Heading"
                      value={s.heading}
                      rows={2}
                      onChange={(v) => setSection(si, { heading: v })}
                    />
                    <TextArea
                      label="Body (blank line = new paragraph)"
                      value={s.body.join("\n\n")}
                      rows={5}
                      onChange={(v) =>
                        setSection(si, {
                          body: v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
                        })
                      }
                    />
                    <TextField
                      label="Big statement (optional)"
                      value={s.statement ?? ""}
                      onChange={(v) => setSection(si, { statement: v })}
                    />

                    {/* media slots */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Media</span>
                      {s.media.map((m, mi) => (
                        <div
                          key={mi}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-[11px] text-muted">
                              {m.src || "empty slot — upload below"}
                              {pendingBadge(m.src)}
                            </span>
                            <div className="flex shrink-0 gap-1">
                              <button
                                aria-label="Move up"
                                disabled={mi === 0}
                                onClick={() => moveMedia(si, mi, -1)}
                                className="rounded border border-border px-2 py-1 text-xs disabled:opacity-30"
                              >
                                ↑
                              </button>
                              <button
                                aria-label="Move down"
                                disabled={mi === s.media.length - 1}
                                onClick={() => moveMedia(si, mi, 1)}
                                className="rounded border border-border px-2 py-1 text-xs disabled:opacity-30"
                              >
                                ↓
                              </button>
                              <button
                                aria-label="Remove media"
                                onClick={() => removeMedia(si, mi)}
                                className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                            <TextField
                              label=""
                              value={m.caption ?? ""}
                              onChange={(v) =>
                                setMedia(si, mi, { caption: v })
                              }
                            />
                            <select
                              aria-label="Aspect"
                              value={m.aspect ?? "wide"}
                              onChange={(e) =>
                                setMedia(si, mi, {
                                  aspect: e.target
                                    .value as CaseMedia["aspect"],
                                })
                              }
                              className="self-end rounded-lg border border-border bg-background px-2 py-2 text-sm"
                            >
                              <option value="wide">Wide 11:4</option>
                              <option value="screen">Screen 17:9</option>
                              <option value="tall">Tall 17:18</option>
                            </select>
                          </div>
                        </div>
                      ))}
                      <label className="block cursor-pointer rounded-lg border border-dashed border-border px-3 py-2.5 text-center text-sm text-muted hover:text-foreground">
                        + Add image or video
                        <input
                          type="file"
                          accept="image/*,video/mp4,video/webm"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void addMedia(si, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </details>
              ))}

              {/* impact + result */}
              <details className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Impact numbers
                </summary>
                <div className="mt-4 space-y-2">
                  {draft[caseKey].impact.stats.map((st, i) => (
                    <div key={i} className="grid grid-cols-[1fr_2fr] gap-2">
                      <TextField
                        label={i === 0 ? "Value" : ""}
                        value={st.value}
                        onChange={(v) => setStat(i, { value: v })}
                      />
                      <TextField
                        label={i === 0 ? "Label" : ""}
                        value={st.label}
                        onChange={(v) => setStat(i, { label: v })}
                      />
                    </div>
                  ))}
                </div>
              </details>
              <details className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  The result
                </summary>
                <div className="mt-4 space-y-3">
                  <TextArea
                    label="Body"
                    value={draft[caseKey].result.body.join("\n\n")}
                    rows={3}
                    onChange={(v) =>
                      setCase({
                        result: {
                          ...draft[caseKey].result,
                          body: v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
                        },
                      })
                    }
                  />
                  <TextArea
                    label="Closing statement"
                    value={draft[caseKey].result.statement}
                    rows={2}
                    onChange={(v) =>
                      setCase({
                        result: { ...draft[caseKey].result, statement: v },
                      })
                    }
                  />
                </div>
              </details>
              {mediaErr && (
                <p className="text-xs leading-relaxed text-red-700">
                  {mediaErr}
                </p>
              )}
              {pending.length > 0 && (
                <p className="text-xs leading-relaxed text-muted">
                  {pending.length} media file{pending.length > 1 ? "s" : ""}{" "}
                  staged (
                  {Math.round(
                    pending.reduce((n, m) => n + m.bytes, 0) / 1024,
                  )}
                  KB) — commits on save. Staged uploads don&rsquo;t survive a
                  page reload.
                </p>
              )}
            </Group>

            </div>
          ) : (
            /* --------------------------------------------------- log tab */
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

        {/* save */}
        <div className="shrink-0 border-t border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save & publish"}
            </button>
            <button
              onClick={() => {
                setDraft(defaults);
                setPending([]);
                setMediaErr("");
              }}
              disabled={!dirty || saving}
              className="rounded-full border border-border px-4 py-2.5 text-sm disabled:opacity-40"
            >
              Reset
            </button>
          </div>
          {dirty && (
            <p className="mt-2 text-xs text-muted">
              {changes.length} unsaved change{changes.length === 1 ? "" : "s"}
              {pending.length > 0 && ` · ${pending.length} media`} — drafts
              persist in this browser until saved.
            </p>
          )}
          {status && (
            <p className="mt-2 text-xs leading-relaxed text-muted">{status}</p>
          )}
        </div>
      </aside>
    </>
  );
}
