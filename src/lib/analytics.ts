import { track } from "@vercel/analytics";

/*
 * Interactions, on top of Vercel Web Analytics' own page views, visitors,
 * countries, devices and referrers. One event name per thing a visitor can
 * do; the label says which one (which case, which Lab cover, which piece).
 * Never a name or an identity — visitors are anonymous, and the tool is
 * cookieless. Enable Analytics on the Vercel project to see any of it.
 */
export type SiteEvent =
  | "nav" // a nav link: label = its text
  | "case_open" // a deck cover or its button: label = the case
  | "next_up" // the Next-up ending: label = the case it leads to
  | "chapter_jump" // the case study index: label = chapter id
  | "lab_open" // a Lab cover with a live app: label = its name
  | "film_open" // the camera on the desk
  | "record_play" // the record on the desk, when it actually plays
  | "desk_drag" // a piece moved on the desk: label = the piece
  | "contact" // the closing "Tell me about it" button or the Contact link
  | "resume" // the resume opened
  | "gallery_open"; // the gallery entered

export function trackEvent(name: SiteEvent, label?: string): void {
  try {
    track(name, label ? { label } : undefined);
  } catch {
    /* analytics must never break an interaction */
  }
}
