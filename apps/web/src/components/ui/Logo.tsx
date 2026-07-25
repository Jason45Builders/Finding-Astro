import { cn } from "@/lib/utils";

interface LogoMarkProps extends React.SVGAttributes<SVGSVGElement> {
  className?: string;
}

/**
 * The Finding Astro mark: a paw print fused into a map pin - the app both
 * locates animals and rescues them, so the mark reads as either shape at a
 * glance. Doubles as the literal pin icon on the City Map.
 */
export function LogoMark({ className, ...props }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 200 200" className={cn("shrink-0", className)} {...props}>
      <path
        d="M100,192 C64,146 30,112 30,78 A70,70 0 1,1 170,78 C170,112 136,146 100,192 Z"
        className="fill-primary"
      />
      <ellipse cx="100" cy="103" rx="27" ry="21" className="fill-secondary-container" />
      <ellipse cx="64" cy="58" rx="14" ry="18" transform="rotate(-18 64 58)" className="fill-surface" />
      <ellipse cx="100" cy="42" rx="15" ry="19" className="fill-surface" />
      <ellipse cx="136" cy="58" rx="14" ry="18" transform="rotate(18 136 58)" className="fill-surface" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markClassName?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { mark: "w-6 h-6", name: "text-lg" },
  md: { mark: "w-8 h-8", name: "text-2xl" },
  lg: { mark: "w-10 h-10", name: "text-3xl" },
};

/** Full lockup: mark + wordmark, with the tagline set below rather than crowding the name. */
export function Logo({ className, markClassName, showTagline = false, size = "md" }: LogoProps) {
  const s = SIZES[size];
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2.5">
        <LogoMark className={cn(s.mark, markClassName)} />
        <span className={cn("font-display-lg font-extrabold text-primary tracking-tight leading-none", s.name)}>
          Finding Astro
        </span>
      </div>
      {showTagline && (
        <p className="font-label-caps text-label-caps text-secondary mt-2.5 uppercase">Civic Animal Welfare</p>
      )}
    </div>
  );
}
