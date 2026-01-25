"use client";

/**
 * Skip Links Component
 * Provides keyboard users quick navigation to main content areas
 */

interface SkipLink {
  href: string;
  label: string;
}

const defaultLinks: SkipLink[] = [
  { href: "#main-content", label: "Skip to main content" },
  { href: "#main-navigation", label: "Skip to navigation" },
];

export function SkipLinks({ links = defaultLinks }: { links?: SkipLink[] }) {
  return (
    <nav aria-label="Skip links" className="sr-only focus-within:not-sr-only">
      <ul className="fixed top-0 left-0 z-[100] flex gap-2 p-2 bg-background">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="
                sr-only focus:not-sr-only
                px-4 py-2
                bg-primary text-primary-foreground
                rounded-md font-medium
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                transition-colors
              "
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default SkipLinks;
