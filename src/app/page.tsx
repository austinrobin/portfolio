import { preload } from "react-dom";
import { mediaUrl } from "@/lib/media-url";
import { showcase } from "@/lib/showcase";
import { PortraitHero } from "@/components/home/portrait-hero";
import { BanknoteNav } from "@/components/banknote-nav";
import { ScrollToHash } from "@/components/scroll-to-hash";
import { CurrentBuild } from "@/components/home/current-build";
import { ProjectDeck } from "@/components/home/project-deck";
import { LabTeaser } from "@/components/home/lab-teaser";
import { LifeCollage } from "@/components/home/life-collage";
import { BanknoteFooter } from "@/components/home/banknote-footer";

export default function Home() {
  /* the engraving is the hero's texture and its largest byte — ask for it
     before the stylesheet and scripts are even parsed */
  preload(mediaUrl("/hero-art.webp"), { as: "image", fetchPriority: "high", crossOrigin: "anonymous" });
  return (
    <div>
      {/* the nav stays with the reader; only the monogram slips away on scroll */}
      <BanknoteNav fixed />
      <ScrollToHash />
      <PortraitHero hideNav />

      {/* Currently building — High (coin + script, per the Figma export) */}
      <CurrentBuild />

      {/* Work — scroll-driven flip deck; the giant script leads the section
          in and recedes behind the folder (design: Select Works) */}
      <section id="work" className="scroll-mt-16">
        <h2 className="sr-only">Select Works</h2>
        <ProjectDeck items={showcase} />
      </section>

      {/* The Lab — AI / design-engineer teaser (no rule above it: the paper
          runs on from the deck; the wrapper only stops the cascade's slide-in
          from widening the page) */}
      <div className="overflow-x-clip">
        <LabTeaser />
      </div>

      {/* Studio / Life — the draggable desk collage (paper continues from
          the sections above; no divider, the spread is the transition) */}
      <LifeCollage />

      {/* Closing plate — the banknote dedication (prints itself in) */}
      <BanknoteFooter />
    </div>
  );
}
