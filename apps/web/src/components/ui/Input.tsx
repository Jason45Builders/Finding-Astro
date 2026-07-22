import React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full bg-surface-container-low border-b-2 border-outline focus:border-primary focus:ring-0 focus:outline-none px-4 py-3 rounded-t-md transition-colors font-body-md text-on-surface placeholder:text-outline";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "resize-none min-h-[100px]", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, "appearance-none cursor-pointer", className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5 ml-1", className)}
      {...props}
    >
      {children}
    </label>
  );
}
