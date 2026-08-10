"use client";

export type AppointmentProfessionalBadge = {
  label: string;
  text: string;
  compact: boolean;
} | null;

type AppointmentProfessionalBadgeMarkProps = {
  badge: Exclude<AppointmentProfessionalBadge, null>;
};

export function AppointmentProfessionalBadgeMark({ badge }: AppointmentProfessionalBadgeMarkProps) {
  return (
    <span
      title={badge.label}
      className={`pointer-events-none absolute right-1 top-7 z-[2] inline-flex h-[16px] max-w-[54px] items-center justify-center truncate rounded-sm border border-white/80 bg-white/90 text-[9px] font-bold uppercase text-[#0F172A] ${
        badge.compact ? "w-7 px-0" : "px-1.5"
      }`}
    >
      {badge.text}
    </span>
  );
}
