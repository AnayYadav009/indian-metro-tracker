import type { HTMLAttributes, ReactNode } from "react";

interface AppHeaderProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  variant: "compact" | "page";
}

export function AppHeader({
  children,
  className = "",
  variant,
  ...props
}: AppHeaderProps) {
  const layout =
    variant === "compact"
      ? "relative h-[calc(3.5rem+env(safe-area-inset-top))] px-4 pt-[env(safe-area-inset-top)] md:h-14 md:px-6 md:pt-0"
      : "sticky top-0 px-4 pt-[calc(env(safe-area-inset-top)+.75rem)] pb-3 md:px-8 md:pt-3";

  return (
    <header
      {...props}
      className={`z-40 flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 backdrop-blur ${layout} ${className}`}
    >
      {children}
    </header>
  );
}
