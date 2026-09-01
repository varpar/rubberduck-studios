export type DuckMovementKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown";

type DuckKeyboardState = Record<DuckMovementKey, boolean>;

const state: DuckKeyboardState = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
};

function isMovementKey(key: string): key is DuckMovementKey {
  return (
    key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === "ArrowUp" ||
    key === "ArrowDown"
  );
}

/**
 * DOM key events are collected once in the persistent app shell. The R3F
 * frame loop reads this tiny module store directly, avoiding React renders and
 * ensuring navigation/Suspense never detaches the keyboard listener.
 */
export const duckKeyboard = {
  getState: () => state,

  press(key: string) {
    if (!isMovementKey(key)) return false;
    state[key] = true;
    return true;
  },

  release(key: string) {
    if (!isMovementKey(key)) return false;
    state[key] = false;
    return true;
  },

  clear() {
    state.ArrowLeft = false;
    state.ArrowRight = false;
    state.ArrowUp = false;
    state.ArrowDown = false;
  },
};
