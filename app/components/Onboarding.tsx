"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Users, MessageSquare, Command } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    icon: Building2,
    title: "ยินดีต้อนรับสู่ OMNIA.AI",
    description: "รวมทุกศาสตร์พยากรณ์ไว้ในที่เดียว — AI Agents หลายตัวถกเถียงและสรุปผลดูดวงให้อย่างแม่นยำ",
  },
  {
    id: "agents",
    icon: Users,
    title: "5 หมอดู AI พร้อมใช้งาน",
    description: "โหราศาสตร์ไทย, BaZi จีน, เลข 7 ตัว, ยูเรเนียน, ทักษามหาพยากรณ์ — ทำงานร่วมกันอัตโนมัติ",
  },
  {
    id: "research",
    icon: MessageSquare,
    title: "เริ่มถามดูดวง",
    description: "ไปที่ 'ดูดวง' พิมพ์คำถาม เช่น 'ปีนี้ดวงการงานเป็นอย่างไร?' แล้ว AI ทั้งทีมจะวิเคราะห์และสรุปให้",
  },
  {
    id: "shortcuts",
    icon: Command,
    title: "Keyboard Shortcuts",
    description: "กด ? เพื่อดู shortcuts ทั้งหมด — ⌘+1–5 สลับหน้า, ⌘+Shift+N ประชุมใหม่",
  },
];

const STORAGE_KEY = "omnia-ai-onboarding-done";

export function useOnboarding() {
  const [step, setStep] = useState(-1); // -1 = not showing
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Show onboarding after a brief delay
      const timer = setTimeout(() => {
        setStep(0);
        setVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const next = useCallback(() => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }, [step]);

  const skip = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  return { step, visible, next, skip, totalSteps: ONBOARDING_STEPS.length };
}

export function OnboardingOverlay({
  visible,
  step,
  totalSteps,
  onNext,
  onSkip,
}: {
  visible: boolean;
  step: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  if (!visible || step < 0 || step >= ONBOARDING_STEPS.length) return null;

  const current = ONBOARDING_STEPS[step];
  const isLast = step === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md mx-4 rounded-xl border shadow-lg overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-5 pb-2">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all"
              style={{
                width: i === step ? 24 : 8,
                background: i === step ? "var(--accent)" : i < step ? "var(--accent)" : "var(--border)",
                opacity: i <= step ? 1 : 0.4,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 text-center">
          <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--accent-10)" }}>
            <current.icon size={24} style={{ color: "var(--accent)" }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {current.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-5">
          <button
            onClick={onSkip}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface)]"
            style={{ color: "var(--text-muted)" }}
          >
            ข้าม
          </button>
          <button
            onClick={onNext}
            className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {isLast ? "เริ่มใช้งาน!" : `ต่อไป (${step + 1}/${totalSteps})`}
          </button>
        </div>
      </div>
    </div>
  );
}
