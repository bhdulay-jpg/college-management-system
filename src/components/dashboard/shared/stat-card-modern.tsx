import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { cn } from "../../ui/utils";

interface StatCardModernProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  variant?: "primary" | "success" | "warning" | "error" | "info" | "default";
  className?: string;
}

const variantStyles = {
  primary: "bg-primary/10 group-hover:bg-primary/20 text-primary",
  success: "bg-success/10 group-hover:bg-success/20 text-success",
  warning: "bg-warning/10 group-hover:bg-warning/20 text-warning",
  error: "bg-destructive/10 group-hover:bg-destructive/20 text-destructive",
  info: "bg-info/10 group-hover:bg-info/20 text-info",
  default: "bg-muted group-hover:bg-muted/80 text-foreground",
};

/**
 * Modern stat card component with consistent styling across all dashboards
 * Features: elevation, hover states, icon, label, and value display
 */
export function StatCardModern({
  icon: Icon,
  label,
  value,
  variant = "default",
  className,
}: StatCardModernProps) {
  return (
    <Card className={cn("border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-card group", className)}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
            variantStyles[variant]
          )}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground font-medium mb-1 truncate">{label}</div>
            <div className="text-2xl font-medium text-foreground truncate">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
