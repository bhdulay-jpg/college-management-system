import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Table } from "../../ui/table";
import { cn } from "../../ui/utils";

interface DataTableModernProps {
  title?: string;
  description?: string;
  children: ReactNode;
  headerAction?: ReactNode;
  className?: string;
}

/**
 * Modern data table wrapper with consistent card styling
 * Provides elevation, proper spacing, and optional header
 */
export function DataTableModern({
  title,
  description,
  children,
  headerAction,
  className,
}: DataTableModernProps) {
  return (
    <Card className={cn("border-0 shadow-md bg-card", className)}>
      {(title || headerAction) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription className="mt-1">{description}</CardDescription>}
            </div>
            {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={title || headerAction ? "" : "pt-6"}>
        <div className="border border-border rounded-lg overflow-hidden">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
