import { createSignal } from "solid-js";

interface UseSwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
}

export function useSwipe(options: UseSwipeOptions = {}) {
  const [x, setX] = createSignal(0);
  const [isSwipingSignal, setIsSwipingSignal] = createSignal(false);
  let startX = 0;
  let startY = 0;
  let isSwiping = false;
  let isCancelled = false;

  const touchstart = (e: TouchEvent) => {
    if (options.disabled || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = true;
    setIsSwipingSignal(true);
    isCancelled = false;
  };

  const touchmove = (e: TouchEvent) => {
    if (!isSwiping || isCancelled || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX;
    const diffY = currentY - startY;

    // If movement is mostly vertical, or exceeds vertical threshold (50px), cancel swipe
    if (
      (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) ||
      Math.abs(diffY) > 50
    ) {
      isCancelled = true;
      setIsSwipingSignal(false);
      setX(0);
      return;
    }

    // Prevent default browser gestures (e.g., navigation, pull-to-refresh)
    e.preventDefault();
    setX(diffX);
  };

  const touchend = (_e: TouchEvent) => {
    if (!isSwiping || isCancelled) {
      setX(0);
      isSwiping = false;
      setIsSwipingSignal(false);
      return;
    }

    const currentX = x();
    const threshold = options.threshold ?? 50;

    if (currentX > threshold && options.onSwipeRight) {
      options.onSwipeRight();
    } else if (currentX < -threshold && options.onSwipeLeft) {
      options.onSwipeLeft();
    }

    setX(0);
    isSwiping = false;
    setIsSwipingSignal(false);
  };

  const touchcancel = (_e: TouchEvent) => {
    // Reset swipe state if the browser cancels the touch sequence
    setX(0);
    isSwiping = false;
    setIsSwipingSignal(false);
    isCancelled = false;
  };

  return {
    x,
    isSwiping: isSwipingSignal,
    handlers: {
      ontouchstart: touchstart,
      ontouchmove: touchmove,
      ontouchend: touchend,
      ontouchcancel: touchcancel,
    },
  };
}
