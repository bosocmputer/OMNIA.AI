"use client";

import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { useKeyboardShortcuts, ShortcutsHelp } from "./components/KeyboardShortcuts";
import { useOnboarding, OnboardingOverlay } from "./components/Onboarding";
import { ReactNode } from "react";

function AppOverlays({ children }: { children: ReactNode }) {
  const { showHelp, setShowHelp, shortcuts } = useKeyboardShortcuts();
  const { step, visible, next, skip, totalSteps } = useOnboarding();
  return (
    <>
      {children}
      <ShortcutsHelp show={showHelp} onClose={() => setShowHelp(false)} shortcuts={shortcuts} />
      <OnboardingOverlay visible={visible} step={step} totalSteps={totalSteps} onNext={next} onSkip={skip} />
    </>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppOverlays>{children}</AppOverlays>
      </I18nProvider>
    </ThemeProvider>
  );
}
