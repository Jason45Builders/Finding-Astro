import React from "react";
import { normalizePhotoUrl } from "@/lib/photo-url";

type PhotoProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function Photo({ src, fallbackSrc, alt, className, ...rest }: PhotoProps) {
  const normalized = normalizePhotoUrl(src ?? null);
  const [errored, setErrored] = React.useState(false);

  if (!normalized || errored) {
    if (fallbackSrc) return <img src={fallbackSrc} alt={alt ?? ""} className={className} {...rest} />;
    return null;
  }

  return <img src={normalized} alt={alt ?? ""} className={className} onError={() => setErrored(true)} {...rest} />;
}
