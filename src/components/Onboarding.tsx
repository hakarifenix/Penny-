import { useState } from "react";
import { Wallet, BarChart3, ShieldCheck } from "lucide-react";
import { useSettings } from "../state/SettingsContext";
import { Button } from "./ui/Button";
import { Logo } from "./Logo";
import type { LucideIcon } from "lucide-react";
import type { TranslationKeys } from "../i18n";

interface Slide {
  icon: LucideIcon;
  titleKey: TranslationKeys;
  bodyKey: TranslationKeys;
}

const SLIDES: Slide[] = [
  { icon: Wallet, titleKey: "onboarding.slide1.title", bodyKey: "onboarding.slide1.body" },
  { icon: BarChart3, titleKey: "onboarding.slide2.title", bodyKey: "onboarding.slide2.body" },
  { icon: ShieldCheck, titleKey: "onboarding.slide3.title", bodyKey: "onboarding.slide3.body" },
];

/** First-launch welcome / onboarding flow (3 slides). */
export function Onboarding() {
  const { t, update } = useSettings();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const Icon = slide.icon;
  const isLast = index === SLIDES.length - 1;

  const finish = () => void update({ onboarded: true });

  return (
    <div className="flex min-h-screen flex-col bg-base px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={30} />
          <span className="font-semibold text-ink">{t("app.name")}</span>
        </div>
        {!isLast && (
          <button onClick={finish} className="text-sm text-muted hover:text-ink">
            {t("onboarding.skip")}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div key={index} className="animate-scale-in flex h-24 w-24 items-center justify-center rounded-3xl border border-line bg-surface shadow-card">
          <Icon size={40} className="text-primary" />
        </div>
        <h1 key={`t-${index}`} className="animate-fade-in mt-8 text-2xl font-bold text-ink">
          {t(slide.titleKey)}
        </h1>
        <p key={`b-${index}`} className="animate-fade-in mt-3 max-w-sm text-sm leading-relaxed text-muted">
          {t(slide.bodyKey)}
        </p>
      </div>

      {/* Dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-2 bg-line"}`}
          />
        ))}
      </div>

      <Button
        size="lg"
        fullWidth
        onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
      >
        {isLast ? t("onboarding.start") : t("onboarding.next")}
      </Button>
    </div>
  );
}
