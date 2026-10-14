import React from "react";
import { normalizePhotoUrl } from "@/lib/photo-url";

type PhotoProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  fallbackSrc?: string;
};

/**
 * Render storage photos through the app proxy first, then retry the original
 * public URL. This keeps old Supabase URLs and newly uploaded media working
 * while storage URL formats are being migrated.
 */
export function Photo({ src, fallbackSrc, alt, className, onError, ...rest }: PhotoProps) {
  const normalized = normalizePhotoUrl(src ?? null);
  const candidates = Array.from(new Set([normalized, src?.trim() || null].filter((value): value is string => Boolean(value))));
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    setAttempt(0);
  }, [src]);

  const finalSrc = candidates[attempt] ?? fallbackSrc ?? null;
  if (!finalSrc) return null;

  return (
    <img
      key={finalSrc}
      src={finalSrc}
      alt={alt ?? ""}
      className={className}
      onError={(event) => {
        onError?.(event);
        if (attempt < candidates.length - 1) {
          setAttempt((current) => current + 1);
        } else if (fallbackSrc && finalSrc !== fallbackSrc) {
          setAttempt(candidates.length);
        }
      }}
      {...rest}
    />
  );
}
