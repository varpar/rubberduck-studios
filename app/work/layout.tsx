import type { ReactNode } from "react";
import { PondWorkFrame } from "../_components/PondWorkFrame";

/**
 * This nested layout owns the shared reading frame for the work index and
 * individual studies. The one live pond is mounted by the root layout, so
 * opening a case changes editorial copy—not the world around it.
 */
export default function WorkLayout({ children }: { children: ReactNode }) {
  return <PondWorkFrame>{children}</PondWorkFrame>;
}
