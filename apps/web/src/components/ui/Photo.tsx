import React from "react";
import { normalizePhotoUrl } from "@/lib/photo-url";

type PhotoProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function Photo({ src, fallbackSrc, alt, className, ...rest }: PhotoProps) {
  const normalized = normalizePhotoUrl(src ?? null);
  const [errored, setErrored] = React.useState(false);

  if ((!normalized || errored) && !fallbackSrc) {
    return null;
  }

  const finalSrc = (!normalized || errored) ? fallbackSrc : normalized;
  if (!finalSrc) return null;

  return <img src={finalSrc} alt={alt ?? ""} className={className} onError={() => { console.error("[Photo] load error src=" + normalized); setErrored(true); }} {...rest} />;
}
