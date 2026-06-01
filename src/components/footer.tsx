import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-3xl leading-tight">Let&rsquo;s talk.</p>
          <a
            href={`mailto:${siteConfig.email}`}
            className="mt-1 inline-block text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            {siteConfig.email}
          </a>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex gap-4">
            {siteConfig.socials.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {s.label}
              </Link>
            ))}
          </div>
          <p className="font-mono text-xs text-muted">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
