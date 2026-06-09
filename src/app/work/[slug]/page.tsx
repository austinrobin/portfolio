import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCaseStudy, getCaseStudySlugs } from "@/lib/case-studies";
import { CaseStudyView } from "@/components/case-study/case-study";

export function generateStaticParams() {
  return getCaseStudySlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cs = getCaseStudy(slug);
  if (!cs) return {};
  return { title: cs.title, description: cs.tagline };
}

export default async function WorkDetail({
  params,
}: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const cs = getCaseStudy(slug);
  if (!cs) notFound();
  return <CaseStudyView cs={cs} />;
}
