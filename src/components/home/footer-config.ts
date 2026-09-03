import footerDefaults from "../../../content/footer.json";

/* The banknote dedication plate's layout — every position, size and line
   of script, editable from /studio (content/footer.json, git-backed).
   All x/y/w values are % of the plate; the composition stays symmetric
   (left pieces at x, right pieces mirrored at the same inset). */
export interface FooterSettings {
  /* plate */
  plateHeight: number; // plate height as % of its width (62 = mock ratio)
  showGuilloche: boolean;
  guillocheOpacity: number; // multiplier on the ground's whisper strokes
  /* pegasi (left one is the mirrored copy — the asset faces right) */
  pegasusX: number;
  pegasusY: number;
  pegasusW: number;
  /* AUSTIN engraving (always centred) */
  austinY: number;
  austinW: number;
  /* colonnades (bottom-anchored, mirrored pair) */
  colonnadeX: number;
  colonnadeBottom: number;
  colonnadeW: number;
  /* scripts */
  verseText: string; // \n = line break
  verseY: number;
  verseSize: number; // vw
  monogramY: number;
  monogramW: number;
  dedicationText: string;
  dedicationY: number;
  dedicationSize: number; // vw
}

export const footerConfig: FooterSettings = footerDefaults;
