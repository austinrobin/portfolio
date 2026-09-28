import { Curtain } from "@/components/loader/plate-run";

/* while the page streams in, the plates run under the ink curtain */
export default function Loading() {
  return <Curtain lift={false} />;
}
