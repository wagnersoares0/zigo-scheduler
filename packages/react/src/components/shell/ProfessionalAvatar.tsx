"use client";

import { useState } from "react";
import { getNameInitials } from "@zigoschedule/scheduler-engine";

type Props = {
  nome: string;
  fotoUrl?: string | null;
  className: string;
  initialsClassName: string;
  fallbackClassName: string;
};

const safeImageSrc = (value: string | null | undefined): string => {
  const src = typeof value === "string" ? value.trim() : "";
  if (!src) return "";
  const schemeIndex = src.indexOf(":");
  if (schemeIndex === -1) return src;

  const scheme = src.slice(0, schemeIndex).toLowerCase();
  if (scheme === "http" || scheme === "https" || scheme === "blob") return src;
  if (scheme === "data" && /^data:image\//i.test(src)) return src;
  return "";
};

export function ProfessionalAvatar({
  nome,
  fotoUrl,
  className,
  initialsClassName,
  fallbackClassName,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const src = safeImageSrc(fotoUrl);
  const hasImage = src.length > 0 && !imgError;

  if (hasImage) {
    return (
      // Plain <img> on purpose: the avatar is already size-constrained, and a
      // framework image component would tie this package to a host framework.
      <img
        src={src}
        alt=""
        width={64}
        height={64}
        decoding="async"
        loading="lazy"
        referrerPolicy="no-referrer"
        className={className}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${className} ${fallbackClassName}`}>
      <span className={initialsClassName}>{getNameInitials(nome)}</span>
    </div>
  );
}
