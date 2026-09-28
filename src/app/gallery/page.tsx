import type { Metadata } from "next";
import { GalleryCanvas } from "@/components/gallery/gallery-canvas";
import { RouteCurtain } from "@/components/loader/route-curtain";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "An endless canvas of digital art, design explorations and photographs.",
};

export default function GalleryPage() {
  return (
    <>
      <RouteCurtain />
      <GalleryCanvas />
    </>
  );
}
