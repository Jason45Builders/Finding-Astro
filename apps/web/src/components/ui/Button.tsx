import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-bold transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-container",
        coral: "coral-gradient text-white shadow-sm",
        outline: "border-2 border-primary text-primary hover:bg-primary hover:text-on-primary",
        secondary: "bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary",
        ghost: "text-on-surface-variant hover:bg-surface-container-high",
        danger: "bg-error text-on-error hover:bg-error/90",
      },
      size: {
        sm: "text-xs px-3 py-1.5",
        md: "text-sm px-4 py-2.5",
        lg: "text-base px-6 py-3.5 rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  }
);
Button.displayName = "Button";
