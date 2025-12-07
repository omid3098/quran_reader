import { useLayoutEffect, useRef, useState } from "react";

const DEFAULT_THRESHOLD = 8;

/**
 * Hides content when scrolling down and shows it when scrolling up.
 * Listens only to the provided container (or documentElement if missing) to avoid
 * conflicting window scroll events when the window itself doesn't scroll.
 */
export const useHideOnScroll = (
  container?: HTMLElement | null,
  threshold: number = DEFAULT_THRESHOLD
) => {
  const [isHidden, setIsHidden] = useState(false);
  const lastPos = useRef(0);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const scrollTarget: HTMLElement =
      container || document.documentElement || (document.body as HTMLElement);

    const getPosition = () => {
      return scrollTarget.scrollTop;
    };

    lastPos.current = getPosition();

    const handleScroll = () => {
      const current = getPosition();
      const delta = current - lastPos.current;

      if (current <= threshold) {
        setIsHidden(false);
      } else if (delta > threshold) {
        setIsHidden(true);
      } else if (delta < 0) {
        setIsHidden(false);
      }

      lastPos.current = current;
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY > threshold) setIsHidden(true);
      if (event.deltaY < -threshold) setIsHidden(false);
    };

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    scrollTarget.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      scrollTarget.removeEventListener("wheel", handleWheel);
    };
  }, [container, threshold]);

  return isHidden;
};
