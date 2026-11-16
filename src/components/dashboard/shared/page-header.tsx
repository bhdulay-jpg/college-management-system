import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: React.ReactNode;
}

/**
 * Universal page header component for all portal pages
 * Clean design with icon, title and description
 */
export function PageHeader({ title, description, icon: Icon, action }: PageHeaderProps) {
  return (
    <div className="bg-muted/30 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl text-foreground">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          {action && (
            <div className="flex items-center gap-2 md:mt-1">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
