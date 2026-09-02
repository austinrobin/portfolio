"use client";

/*
 * Single GSAP entry point — import { gsap, ScrollTrigger, useGSAP } from
 * "@/lib/gsap" instead of "gsap" directly, so plugin registration happens
 * exactly once and every component agrees on the same instances.
 *
 * All plugins are free as of GSAP 3.13+ (SplitText, ScrollSmoother, MorphSVG…)
 * — add registrations here as sections start using them.
 */
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, SplitText);

export { gsap, useGSAP, ScrollTrigger, ScrollSmoother, SplitText };
