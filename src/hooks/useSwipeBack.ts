import { useEffect, useRef } from 'react';

interface UseSwipeBackOptions {
  onBack: () => void;
  enabled?: boolean;
  threshold?: number;
}

/**
 * Custom hook to detect swipe gestures on mobile screens
 * Swiping horizontally (e.g. from right-to-left or left-edge-to-right) returns to the main notes screen
 * preventing accidental browser minimize or exit.
 */
export function useSwipeBack({
  onBack,
  enabled = true,
  threshold = 75,
}: UseSwipeBackOptions) {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping.current || e.touches.length !== 1) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartX.current;
      const deltaY = currentY - touchStartY.current;

      // If user is predominantly swiping horizontally (especially right-to-left)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 15) {
        // Prevent default browser history or minimize gestures
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping.current) return;
      isSwiping.current = false;
      const currentX = e.changedTouches[0].clientX;
      const currentY = e.changedTouches[0].clientY;
      const deltaX = currentX - touchStartX.current;
      const deltaY = currentY - touchStartY.current;

      // Right-to-left swipe (deltaX < -threshold) or left-to-right swipe (deltaX > threshold)
      // returns to main notes screen without minimizing app
      const isHorizontalSwipe = Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
      const isRightToLeftSwipe = deltaX < -threshold;

      if (isHorizontalSwipe || (isRightToLeftSwipe && Math.abs(deltaX) > 45)) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(15);
        }
        onBack();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onBack, enabled, threshold]);
}
