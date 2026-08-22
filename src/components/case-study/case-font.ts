import { Inter } from "next/font/google";

/* Case studies are set in Inter — a neo-grotesque, matching the reference's
   heavy sans headings. The landing page keeps Silk Sans + Peristiwa; the
   case study is its own typographic world. */
export const caseFont = Inter({
  variable: "--font-case",
  subsets: ["latin"],
  display: "swap",
});
