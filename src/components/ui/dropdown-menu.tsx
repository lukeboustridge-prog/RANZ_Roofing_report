"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Simple dropdown menu implementation without Radix dependency
// Uses native HTML with styled components

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("Dropdown components must be used within a DropdownMenu");
  }
  return context;
}

interface DropdownMenuProps {
  children: React.ReactNode;
}

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
  const { open, setOpen } = useDropdownMenu();
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, setOpen]);

  // Close on escape
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, setOpen]);

  const handleClick = () => setOpen(!open);

  if (asChild && React.isValidElement(children)) {
    return (
      <div ref={ref}>
        {React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
          onClick: handleClick,
        })}
      </div>
    );
  }

  return (
    <div ref={ref}>
      <button onClick={handleClick} type="button">
        {children}
      </button>
    </div>
  );
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}

function DropdownMenuContent({
  children,
  align = "center",
  className,
}: DropdownMenuContentProps) {
  const { open } = useDropdownMenu();

  if (!open) return null;

  const alignmentClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <div
      className={cn(
        "absolute top-full z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

function DropdownMenuItem({
  children,
  onClick,
  disabled,
  className,
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenu();

  const handleClick = () => {
    if (!disabled) {
      onClick?.();
      setOpen(false);
    }
  };

  return (
    <button
      type="button"
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />;
}

interface DropdownMenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div className={cn("px-2 py-1.5 text-sm font-semibold", className)}>
      {children}
    </div>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
