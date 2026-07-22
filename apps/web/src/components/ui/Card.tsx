import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm",
        interactive &&
          "transition-all duration-200 ease-out hover:border-primary hover:shadow-md active:scale-[0.99]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";
