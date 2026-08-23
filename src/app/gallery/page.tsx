import type { Metadata } from "next";
import { GalleryCanvas } from "@/components/gallery/gallery-canvas";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "An endless canvas of digital art, design explorations and photographs.",
};

export default function GalleryPage() {
  return <GalleryCanvas />;
}
