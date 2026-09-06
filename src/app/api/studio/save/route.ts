import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

/*
 * Studio save endpoint.
 *
 * Production: commits the changed content files to GitHub (Trees API) in a
 * single commit — the deploy that follows makes the edit permanent, and the
 * commit history doubles as the update log.
 * Development: writes straight to the working tree.
 * Both paths append an entry to content/updates-log.json.
 */

interface SavePayload {
  files: { path: string; content: string; encoding?: "base64" }[];
  summary: string;
  changes: { field: string; from: unknown; to: unknown }[];
}

const ALLOWED = new Set([
  "content/site.json",
  "content/hero.json",
  "content/case-stockbee.json",
  "content/case-lwt.json",
  "content/case-mach.json",
  "content/case-bloom.json",
  "content/lab.json",
  "content/footer.json",
]);
const LOG_PATH = "content/updates-log.json";

/* Studio media uploads: committed alongside the content, but only into the
   case folders, only known formats, and only at sizes the client-side
   compressor should already have produced. */
const MEDIA_PREFIX = "public/case/";
const MEDIA_NAME = /^[a-z0-9][a-z0-9/_-]*\.(webp|jpe?g|png|mp4|webm)$/;
const MEDIA_MAX_BYTES: Record<string, number> = {
  webp: 2_000_000,
  jpg: 2_000_000,
  jpeg: 2_000_000,
  png: 2_000_000,
  mp4: 8_000_000,
  webm: 8_000_000,
};

function mediaError(f: { path: string; content: string; encoding?: string }) {
  const rel = f.path.slice(MEDIA_PREFIX.length);
  if (f.encoding !== "base64") return "media-needs-base64";
  if (!MEDIA_NAME.test(rel) || rel.includes("..")) return "bad-media-name";
  const ext = rel.split(".").pop()!;
  const bytes = Math.floor(f.content.length * 0.75);
  if (bytes > (MEDIA_MAX_BYTES[ext] ?? 0))
    return `media-too-large (${Math.round(bytes / 1024)}KB ${ext})`;
  return null;
}

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const password = process.env.STUDIO_PASSWORD;
  const key = req.headers.get("x-studio-key") ?? "";
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev) {
    if (!password) {
      return NextResponse.json(
        { error: "studio-not-configured", hint: "Set STUDIO_PASSWORD in Vercel env." },
        { status: 501 },
      );
    }
    if (key !== password) return unauthorized();
  }

  let payload: SavePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!payload.files?.length) {
    return NextResponse.json({ error: "bad-paths" }, { status: 400 });
  }
  for (const f of payload.files) {
    if (ALLOWED.has(f.path)) continue;
    if (f.path.startsWith(MEDIA_PREFIX)) {
      const err = mediaError(f);
      if (err)
        return NextResponse.json({ error: err, path: f.path }, { status: 400 });
      continue;
    }
    return NextResponse.json(
      { error: "bad-paths", path: f.path },
      { status: 400 },
    );
  }

  const entry = {
    at: new Date().toISOString(),
    summary: payload.summary || "Studio update",
    changes: payload.changes ?? [],
  };

  /* ------------------------------------------------ dev: write to disk */
  if (isDev) {
    const root = process.cwd();
    for (const f of payload.files) {
      const target = path.join(root, f.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (f.encoding === "base64") {
        fs.writeFileSync(target, Buffer.from(f.content, "base64"));
      } else {
        fs.writeFileSync(target, f.content);
      }
    }
    const logFile = path.join(root, LOG_PATH);
    const log = JSON.parse(fs.readFileSync(logFile, "utf8"));
    log.unshift(entry);
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2) + "\n");
    return NextResponse.json({ ok: true, mode: "dev" });
  }

  /* ------------------------------------------- prod: commit via GitHub */
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "austinrobin/portfolio";
  const branch = process.env.GITHUB_BRANCH ?? "main";
  if (!token) {
    return NextResponse.json(
      {
        error: "github-not-connected",
        hint: "Set GITHUB_TOKEN (contents: read/write) in Vercel env.",
      },
      { status: 501 },
    );
  }

  const gh = async (url: string, init?: RequestInit) => {
    const res = await fetch(`https://api.github.com${url}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`${url} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return res.json();
  };

  try {
    // current head + existing log
    const ref = await gh(`/repos/${repo}/git/ref/heads/${branch}`);
    const headSha = ref.object.sha;
    const head = await gh(`/repos/${repo}/git/commits/${headSha}`);

    let log: unknown[] = [];
    try {
      const cur = await gh(
        `/repos/${repo}/contents/${LOG_PATH}?ref=${branch}`,
      );
      log = JSON.parse(Buffer.from(cur.content, "base64").toString("utf8"));
    } catch {
      /* first save — start a fresh log */
    }
    log.unshift(entry);

    // binary files need a blob each (the Trees API only inlines utf-8 text)
    const treeItems: Record<string, string>[] = [];
    for (const f of payload.files) {
      if (f.encoding === "base64") {
        const blob = await gh(`/repos/${repo}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({ content: f.content, encoding: "base64" }),
        });
        treeItems.push({
          path: f.path,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        });
      } else {
        treeItems.push({
          path: f.path,
          mode: "100644",
          type: "blob",
          content: f.content,
        });
      }
    }

    const tree = await gh(`/repos/${repo}/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: head.tree.sha,
        tree: [
          ...treeItems,
          {
            path: LOG_PATH,
            mode: "100644",
            type: "blob",
            content: JSON.stringify(log, null, 2) + "\n",
          },
        ],
      }),
    });

    const commit = await gh(`/repos/${repo}/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message: `studio: ${entry.summary}`,
        tree: tree.sha,
        parents: [headSha],
      }),
    });

    await gh(`/repos/${repo}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha }),
    });

    return NextResponse.json({ ok: true, mode: "github", commit: commit.sha });
  } catch (e) {
    return NextResponse.json(
      { error: "github-failed", detail: String(e).slice(0, 300) },
      { status: 502 },
    );
  }
}
