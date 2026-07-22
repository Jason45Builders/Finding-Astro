import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-surface-container-highest text-on-surface-variant",
        primary: "bg-primary-fixed text-on-primary-fixed-variant",
        success: "bg-green-100 text-green-800",
        warning: "bg-secondary-fixed text-on-secondary-fixed-variant",
        danger: "bg-error-container text-on-error-container",
        info: "bg-sky-100 text-sky-800",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}

export function StatusBadge({
  token,
  className,
}: {
  token: { label: string; variant: BadgeVariant };
  className?: string;
}) {
  return (
    <Badge variant={token.variant} className={className}>
      {token.label}
    </Badge>
  );
}
