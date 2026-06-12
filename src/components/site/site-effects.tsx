"use client";

import { useMounted } from "@/hooks/use-mounted";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const REVEAL_BOUND_ATTR = "data-reveal-bound";

function isRevealInView(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.height > 0 &&
    rect.top < window.innerHeight - 80 &&
    rect.bottom > 0
  );
}

function bindNewRevealElements(observer: IntersectionObserver) {
  let delayIndex = document.querySelectorAll(".reveal.is-visible").length;

  document.querySelectorAll(".reveal:not(.is-visible)").forEach((element) => {
    if (element.getAttribute(REVEAL_BOUND_ATTR) === "true") return;

    element.setAttribute(REVEAL_BOUND_ATTR, "true");
    const htmlElement = element as HTMLElement;
    htmlElement.style.transitionDelay = `${Math.min(delayIndex * 40, 240)}ms`;
    delayIndex += 1;

    if (isRevealInView(element)) {
      element.classList.add("is-visible");
      return;
    }

    observer.observe(element);
  });
}

export function SiteEffects() {
  const pathname = usePathname();
  const mounted = useMounted();
  const bindScheduledRef = useRef(false);

  useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      if (window.scrollY > 12) {
        document.body.classList.add("is-scrolled");
      } else {
        document.body.classList.remove("is-scrolled");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" },
    );

    const bindReveals = () => bindNewRevealElements(observer);

    const scheduleBindReveals = () => {
      if (bindScheduledRef.current) return;
      bindScheduledRef.current = true;
      requestAnimationFrame(() => {
        bindScheduledRef.current = false;
        bindReveals();
      });
    };

    // First bind after hydration — never mutate reveal nodes during SSR/hydration.
    const initialId = window.setTimeout(scheduleBindReveals, 0);

    const mutationObserver = new MutationObserver(() => {
      scheduleBindReveals();
    });

    const mutationStartId = window.setTimeout(() => {
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }, 50);

    const retryIds = [150, 400, 800].map((delay) =>
      window.setTimeout(scheduleBindReveals, delay),
    );

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(initialId);
      window.clearTimeout(mutationStartId);
      retryIds.forEach(clearTimeout);
      observer.disconnect();
      mutationObserver.disconnect();
      document
        .querySelectorAll(`[${REVEAL_BOUND_ATTR}="true"]`)
        .forEach((element) => {
          element.removeAttribute(REVEAL_BOUND_ATTR);
          (element as HTMLElement).style.transitionDelay = "";
        });
    };
  }, [mounted, pathname]);

  return null;
}
