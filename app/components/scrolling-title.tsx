"use client";

import { useEffect, useRef, useCallback } from "react";

interface ScrollingTitleProps {
  title: string;
  className?: string;
  baseTime?: number; // PC用の基準時間（秒）
  baseTimeMobile?: number; // SP用の基準時間（秒）
}

export function ScrollingTitle({
  title,
  className = "",
  baseTime = 25,
  baseTimeMobile = 15,
}: ScrollingTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // title変数にスペースを追加
  const titleWithSpacing = `         ${title}         `;

  const copyText = () => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll(".js-tick-item");
    if (!items.length) return;

    let length = 0;
    const marginRight = 64; // 4rem = 64px

    items.forEach((el) => {
      const elWidth = (el as HTMLElement).clientWidth;
      length += elWidth + marginRight; // マージンも含めて計算
      el.insertAdjacentHTML("afterend", (el as HTMLElement).outerHTML);
      if (length > window.innerWidth) return;
    });
  };

  const calculateLoopAnimationSpeed = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLElement>(".js-tick-item");
    if (!items.length) return;

    const distance = window.innerWidth;
    const mql = window.matchMedia("(min-width: 801px)");
    const time = mql.matches ? baseTime : baseTimeMobile;
    const speed = distance / time;

    items.forEach((el, i) => {
      // 要素の幅 + マージン（4rem = 64px）を含めた実際の占有幅を計算
      const elWidth = el.clientWidth;
      const marginRight = 64; // 4rem = 64px
      const totalWidth = elWidth + marginRight;

      const elTime = Math.floor(totalWidth / speed);
      el.style.setProperty("--tick-duration", `${elTime}s`);
      el.style.setProperty("--tick-delay", `${elTime / -2}s`);

      if (i === items.length - 1) {
        container.classList.remove("no-tick");
      }
    });
  }, [baseTime, baseTimeMobile]);

  useEffect(() => {
    copyText();
    calculateLoopAnimationSpeed();

    const resizeObserver = new ResizeObserver(() => {
      calculateLoopAnimationSpeed();
    });
    resizeObserver.observe(document.body);

    return () => {
      resizeObserver.disconnect();
    };
  }, [title, calculateLoopAnimationSpeed]);

  return (
    <div ref={containerRef} className={`c-text no-tick js-tick ${className}`}>
      <div className="c-text__item js-tick-item">{titleWithSpacing}</div>
    </div>
  );
}
