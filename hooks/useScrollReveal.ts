"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * A lightweight scroll-reveal hook using IntersectionObserver.
 *
 * Returns a ref to attach to the container element and a boolean `isVisible`.
 * When the element scrolls into view, `isVisible` becomes true.
 *
 * For stagger animations, add `--stagger-index` CSS custom properties
 * to child elements and use the `.scroll-reveal` CSS class.
 *
 * @example
 * ```tsx
 * const [ref, isVisible] = useScrollReveal({ threshold: 0.15 });
 * return <div ref={ref} className={isVisible ? "visible" : ""}>...</div>;
 * ```
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
): [RefObject<T | null>, boolean] {
  const { threshold = 0.15, rootMargin = "0px 0px -40px 0px", triggerOnce = true } = options;
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) observer.unobserve(el);
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isVisible];
}
