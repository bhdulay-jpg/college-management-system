import { ReactNode } from "react";
import { cn } from "../../ui/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

/**
 * Consistent page container with proper padding and max-width
 */
export function PageContainer({ children, className, maxWidth = "7xl" }: PageContainerProps) {
  return (
    <div className={cn(maxWidthClasses[maxWidth], "mx-auto px-6 md:px-8 py-6 space-y-6", className)}>
      {children}
    </div>
  );
}
