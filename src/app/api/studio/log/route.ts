import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

/* Auth check + update-log read. Dev reads the working tree; prod reads the
   repo via the GitHub API so the log is always the source of truth. */

export async function POST(req: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const password = process.env.STUDIO_PASSWORD;
  const key = req.headers.get("x-studio-key") ?? "";

  if (!isDev) {
    if (!password) {
      return NextResponse.json({ error: "studio-not-configured" }, { status: 501 });
    }
    if (key !== password) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (isDev) {
    const log = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "content/updates-log.json"), "utf8"),
    );
    return NextResponse.json({ ok: true, log });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "austinrobin/portfolio";
  const branch = process.env.GITHUB_BRANCH ?? "main";
  if (!token) return NextResponse.json({ ok: true, log: [] });

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/content/updates-log.json?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return NextResponse.json({ ok: true, log: [] });
    const data = await res.json();
    const log = JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
    return NextResponse.json({ ok: true, log });
  } catch {
    return NextResponse.json({ ok: true, log: [] });
  }
}
