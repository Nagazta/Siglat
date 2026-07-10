import { useEffect, useState } from "react";

/**
 * Animated counter that counts up from 0 to a target value.
 * @param {number} value    - The target number to animate to
 * @param {number} duration - Animation duration in milliseconds
 */
export default function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = typeof value === "number" ? value : parseInt(value, 10) || 0;
    if (end <= 0) {
      setCount(0);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out quad formula for smooth decelerating animation
      const easeProgress = progress * (2 - progress);
      const currentCount = Math.floor(easeProgress * end);

      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
}
