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
  files: { path: string; content: string }[];
  summary: string;
  changes: { field: string; from: unknown; to: unknown }[];
}

const ALLOWED = new Set(["content/site.json", "content/hero.json"]);
const LOG_PATH = "content/updates-log.json";

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
  if (
    !payload.files?.length ||
    payload.files.some((f) => !ALLOWED.has(f.path))
  ) {
    return NextResponse.json({ error: "bad-paths" }, { status: 400 });
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
      fs.writeFileSync(path.join(root, f.path), f.content);
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

    const tree = await gh(`/repos/${repo}/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: head.tree.sha,
        tree: [
          ...payload.files.map((f) => ({
            path: f.path,
            mode: "100644",
            type: "blob",
            content: f.content,
          })),
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
