"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { duckKeyboard } from "../_state/duckKeyboard";
import { useView } from "../_state/navigation";

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/**
 * Keeps arrow input attached to the document instead of a suspenseful WebGL
 * subtree. The ambient home stays free for normal page scrolling; in an
 * underwater story state, the centred duck is always steerable.
 */
export function DuckKeyboardControls() {
  const view = useView();
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Pathname is the immediate source of truth on a direct deep link;
      // `view` covers the state-driven underwater overlay that still lives at
      // the home URL. Together they make keyboard steering available before
      // the WebGL route choreography has finished settling.
      const canSteer = pathname !== "/" || view !== "home";
      if (!canSteer || isEditableTarget(event.target)) return;
      if (!duckKeyboard.press(event.key)) return;
      event.preventDefault();
    }

    function onKeyUp(event: KeyboardEvent) {
      duckKeyboard.release(event.key);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", duckKeyboard.clear);
    return () => {
      duckKeyboard.clear();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", duckKeyboard.clear);
    };
  }, [pathname, view]);

  return null;
}
