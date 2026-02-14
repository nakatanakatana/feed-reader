let touchIdentifier = 0;

/**
 * Resets the global touch identifier counter.
 * Use this in beforeEach to ensure deterministic tests.
 */
export const resetTouchIdentifier = () => {
  touchIdentifier = 0;
};

interface TouchOptions {
  x: number;
  y: number;
  id?: number;
}

/**
 * Creates a Touch object. Fallback to a plain object if Touch constructor is not available.
 */
export const createTouch = (
  target: EventTarget,
  options: TouchOptions,
): Touch => {
  const identifier = options.id ?? ++touchIdentifier;
  if (typeof Touch !== "undefined") {
    try {
      return new Touch({
        identifier,
        target,
        clientX: options.x,
        clientY: options.y,
        pageX: options.x,
        pageY: options.y,
      });
    } catch (_e) {
      // Some environments might have Touch defined but not a constructor
    }
  }
  return {
    identifier,
    target,
    clientX: options.x,
    clientY: options.y,
    pageX: options.x,
    pageY: options.y,
  } as unknown as Touch;
};

/**
 * Creates a TouchEvent. Fallback to a plain object if TouchEvent constructor is not available.
 */
export const createTouchEvent = (
  type: string,
  _target: EventTarget,
  touches: Touch[],
): TouchEvent => {
  if (typeof TouchEvent !== "undefined") {
    try {
      return new TouchEvent(type, {
        touches,
        targetTouches: touches,
        changedTouches: touches,
        bubbles: true,
        cancelable: true,
      });
    } catch (_e) {
      // Fallback
    }
  }
  return {
    type,
    touches,
    targetTouches: touches,
    changedTouches: touches,
    bubbles: true,
    cancelable: true,
    preventDefault: () => {},
    stopPropagation: () => {},
  } as unknown as TouchEvent;
};

/**
 * Dispatches a touch event to the specified target.
 */
export const dispatchTouch = (
  target: HTMLElement,
  type: string,
  x: number,
  y: number,
  id?: number,
) => {
  const touch = createTouch(target, { x, y, id });
  const event = createTouchEvent(type, target, [touch]);
  target.dispatchEvent(event);
  return event;
};
