import Link from "next/link";
import type { CaseStudy, Section } from "@/lib/case-studies";
import { getContents } from "@/lib/case-studies";
import { ContentsNav } from "./contents-nav";
import {
  CaseStudyHero,
  CaseStudyMeta,
  NarrativeSection,
  CalloutSection,
  ImageBand,
  ImpactSection,
  ClosingSection,
} from "./parts";

function renderSection(section: Section) {
  switch (section.kind) {
    case "narrative":
      return <NarrativeSection key={section.id} section={section} />;
    case "callout":
      return <CalloutSection key={section.id} section={section} />;
    case "image":
      return <ImageBand key={section.id} section={section} />;
    case "impact":
      return <ImpactSection key={section.id} section={section} />;
    case "closing":
      return <ClosingSection key={section.id} section={section} />;
  }
}

export function CaseStudyView({ cs }: { cs: CaseStudy }) {
  const contents = getContents(cs);

  return (
    <article className="overflow-x-clip">
      <CaseStudyHero cs={cs} />
      <CaseStudyMeta cs={cs} />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Centered content block */}
        <div className="mx-auto max-w-3xl">{cs.sections.map(renderSection)}</div>
        {/* Floating progress rail in the right margin */}
        <aside className="absolute right-6 top-0 hidden h-full xl:block">
          <div className="sticky top-28 z-10 w-[150px]">
            <ContentsNav items={contents} />
          </div>
        </aside>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-10">
          <Link
            href="/work"
            className="font-mono text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            ← All work
          </Link>
          <Link
            href="/contact"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Work with me
          </Link>
        </div>
      </div>
    </article>
  );
}
