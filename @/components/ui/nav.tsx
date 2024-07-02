import { LucideIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavLink } from "@remix-run/react";

interface NavProps {
  isCollapsed?: boolean;
  links: {
    title: string;
    label?: string;
    icon: LucideIcon;
    to?: string;
    className?: string;
    disabled?: boolean;
    active?: boolean;
  }[];
  className?: string;
  onClick?: () => void;
}

export function Nav({ links, isCollapsed, className, onClick }: NavProps) {
  return (
    <div
      data-collapsed={isCollapsed}
      className={cn(
        "group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2",
        className
      )}
    >
      <nav className="grid gap-1 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {links.map((link, index) => (
          <NavLink
            key={index}
            to={link.disabled || link.active ? "#" : link.to || "#"}
            onClick={onClick}
            className={({ isPending }) =>
              cn(
                "rounded-md",
                buttonVariants({
                  size: "sm",
                  variant: isPending
                    ? "secondary"
                    : link.active && !link.disabled
                      ? "default"
                      : "ghost"
                }),
                "flex flex-row items-center justify-start",
                isPending || link.active || link.disabled
                  ? "pointer-events-none"
                  : null,
                link.disabled && !link.active ? "text-muted-foreground" : null
              )
            }
          >
            <link.icon className="mr-2 h-4 w-4" />
            {link.title}
            {link.label && (
              <span
                className={cn(
                  "ml-auto",
                  link.active &&
                    !link.disabled &&
                    "text-background dark:text-white"
                )}
              >
                {link.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
