import { Card, CardContent } from "../ui/card";
import { LucideIcon } from "lucide-react";
import { Badge } from "../ui/badge";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  description?: string;
}

export function StatCard({ title, value, icon: Icon, change, description }: StatCardProps) {
  return (
    <Card className="border-0 elevation-sm hover:elevation-md transition-all duration-300 bg-card group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-2xl font-medium text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground truncate">{description}</p>
            )}
            {change && (
              <div className="flex items-center gap-1">
                <Badge
                  variant={change.trend === "up" ? "default" : change.trend === "down" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {change.trend === "up" ? "↑" : change.trend === "down" ? "↓" : "→"} {change.value}
                </Badge>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
