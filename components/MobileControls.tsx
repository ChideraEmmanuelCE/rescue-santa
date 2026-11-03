"use client";

import { useEffect, useRef, useState } from "react";

export function MobileControls() {
  const [visible, setVisible] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setVisible(isTouch);
  }, []);

  const press = (key: string) => {
    if (activeKeys.current.has(key)) return;
    activeKeys.current.add(key);
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  };

  const release = (key: string) => {
    if (!activeKeys.current.has(key)) return;
    activeKeys.current.delete(key);
    window.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  };

  const releaseAll = () => {
    activeKeys.current.forEach((k) => release(k));
  };

  useEffect(() => {
    if (!visible || !joystickRef.current || !knobRef.current) return;
    const base = joystickRef.current;
    const knob = knobRef.current;
    let active = false;
    let startX = 0;
    let startY = 0;

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      active = true;
      const t = e.touches[0];
      const rect = base.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
      move(t.clientX, t.clientY);
    };

    const onMove = (e: TouchEvent) => {
      if (!active) return;
      e.preventDefault();
      const t = e.touches[0];
      move(t.clientX, t.clientY);
    };

    const onEnd = () => {
      active = false;
      knob.style.transform = "translate(-50%, -50%)";
      releaseAll();
    };

    const move = (x: number, y: number) => {
      const dx = x - startX;
      const dy = y - startY;
      const dist = Math.min(50, Math.sqrt(dx * dx + dy * dy));
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * dist;
      const ky = Math.sin(angle) * dist;
      knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
      releaseAll();
      if (dist > 12) {
        if (ky < -15) press("w");
        if (ky > 15) press("s");
        if (kx < -15) press("a");
        if (kx > 15) press("d");
      }
    };

    base.addEventListener("touchstart", onStart, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);

    return () => {
      base.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none md:hidden">
      <div ref={joystickRef} className="absolute bottom-10 left-8 w-28 h-28 rounded-full bg-white/15 border-2 border-white/30 pointer-events-auto">
        <div ref={knobRef} className="absolute top-1/2 left-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 border border-white/50" />
      </div>
      <div className="absolute bottom-10 right-8 flex flex-col gap-4 pointer-events-auto">
        <button className="w-16 h-16 rounded-full bg-cyan-500/80 text-white font-bold text-lg border-2 border-cyan-300/50 active:scale-95 transition" onTouchStart={(e) => { e.preventDefault(); press("e"); }} onTouchEnd={() => release("e")} onTouchCancel={() => release("e")}>E</button>
        <button className="w-16 h-16 rounded-full bg-amber-500/80 text-white font-bold text-sm border-2 border-amber-300/50 active:scale-95 transition" onTouchStart={(e) => { e.preventDefault(); press(" "); }} onTouchEnd={() => release(" ")} onTouchCancel={() => release(" ")}>JUMP</button>
      </div>
    </div>
  );
}
