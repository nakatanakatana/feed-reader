import { createSignal } from "solid-js";

interface UseSwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  disabled?: boolean;
  isAtLeftBoundary?: () => boolean;
  isAtRightBoundary?: () => boolean;
  isAtTopBoundary?: () => boolean;
  isAtBottomBoundary?: () => boolean;
}

export function useSwipe(options: UseSwipeOptions = {}) {
  const [x, setX] = createSignal(0);
  const [y, setY] = createSignal(0);
  const [isSwipingSignal, setIsSwipingSignal] = createSignal(false);
  let startX = 0;
  let startY = 0;
  let isSwiping = false;
  let isCancelled = false;
  let direction: "horizontal" | "vertical" | null = null;

  const touchstart = (e: TouchEvent) => {
    if (options.disabled || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = true;
    setIsSwipingSignal(true);
    isCancelled = false;
    direction = null;
  };

  const touchmove = (e: TouchEvent) => {
    if (!isSwiping || isCancelled || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX;
    const diffY = currentY - startY;

    if (!direction) {
      if (Math.abs(diffX) > 2 || Math.abs(diffY) > 2) {
        direction = Math.abs(diffX) > Math.abs(diffY) ? "horizontal" : "vertical";
      } else {
        return;
      }
    }

    if (direction === "horizontal") {
      // If we're tracking horizontal but move too much vertically, cancel
      if (Math.abs(diffY) > 50) {
        isCancelled = true;
        setIsSwipingSignal(false);
        setX(0);
        return;
      }
      
      const isAtLeft = options.isAtLeftBoundary?.() ?? true;
      const isAtRight = options.isAtRightBoundary?.() ?? true;
      
      // Only prevent default and track if moving away from boundary or boundary is reached
      if ((diffX > 0 && isAtLeft) || (diffX < 0 && isAtRight)) {
        e.preventDefault();
        setX(diffX);
      } else {
        setX(0);
      }
    } else {
      // vertical
      // If we're tracking vertical but move too much horizontally, cancel
      if (Math.abs(diffX) > 50) {
        isCancelled = true;
        setIsSwipingSignal(false);
        setY(0);
        return;
      }
      
      const isAtTop = options.isAtTopBoundary?.() ?? true;
      const isAtBottom = options.isAtBottomBoundary?.() ?? true;
      
      // Only prevent default and track if moving away from boundary or boundary is reached
      if ((diffY > 0 && isAtTop) || (diffY < 0 && isAtBottom)) {
        // For vertical, we only prevent default if we have a handler
        if ((diffY > 0 && options.onSwipeDown) || (diffY < 0 && options.onSwipeUp)) {
          e.preventDefault();
        }
        setY(diffY);
      } else {
        setY(0);
      }
    }
  };

  const touchend = (_e: TouchEvent) => {
    if (!isSwiping || isCancelled) {
      setX(0);
      setY(0);
      isSwiping = false;
      setIsSwipingSignal(false);
      return;
    }

    const currentX = x();
    const currentY = y();
    const threshold = options.threshold ?? 50;

    if (direction === "horizontal") {
      if (currentX > threshold && options.onSwipeRight) {
        options.onSwipeRight();
      } else if (currentX < -threshold && options.onSwipeLeft) {
        options.onSwipeLeft();
      }
    } else if (direction === "vertical") {
      if (currentY > threshold && options.onSwipeDown) {
        options.onSwipeDown();
      } else if (currentY < -threshold && options.onSwipeUp) {
        options.onSwipeUp();
      }
    }

    setX(0);
    setY(0);
    isSwiping = false;
    setIsSwipingSignal(false);
    direction = null;
  };

  const touchcancel = (_e: TouchEvent) => {
    // Reset swipe state if the browser cancels the touch sequence
    setX(0);
    setY(0);
    isSwiping = false;
    setIsSwipingSignal(false);
    isCancelled = false;
    direction = null;
  };

  return {
    x,
    y,
    isSwiping: isSwipingSignal,
    handlers: {
      ontouchstart: touchstart,
      ontouchmove: touchmove,
      ontouchend: touchend,
      ontouchcancel: touchcancel,
    },
  };
}
