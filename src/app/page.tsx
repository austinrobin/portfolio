import { showcase } from "@/lib/showcase";
import { PortraitHero } from "@/components/home/portrait-hero";
import { CurrentBuild } from "@/components/home/current-build";
import { ProjectDeck } from "@/components/home/project-deck";
import { LabTeaser } from "@/components/home/lab-teaser";
import { LifeTeaser } from "@/components/home/life-teaser";

export default function Home() {
  return (
    <div>
      <PortraitHero />

      {/* Currently building — High (coin + script, per the Figma export) */}
      <CurrentBuild />

      {/* Work — scroll-driven flip deck; the giant script leads the section
          in and recedes behind the folder (design: Select Works) */}
      <section id="work" className="scroll-mt-16">
        <h2 className="sr-only">Select Works</h2>
        <ProjectDeck items={showcase} />
      </section>

      {/* The Lab — AI / design-engineer teaser */}
      <div className="border-t border-border">
        <LabTeaser />
      </div>

      {/* Studio / Life — leadership + personality teaser */}
      <div className="border-t border-border">
        <LifeTeaser />
      </div>
    </div>
  );
}
