/**
 * Onboarding Layout
 * Minimal layout for the onboarding flow with RANZ branding
 */

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--ranz-charcoal)] via-[var(--ranz-charcoal-dark)] to-[var(--ranz-charcoal)]">
      {/* RANZ Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="text-white">
            <span className="text-2xl font-bold tracking-wider">RANZ</span>
            <span className="text-xs text-white/60 block -mt-1">
              Roofing Association NZ
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-10 px-4 sm:px-6 lg:px-8">{children}</main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-4 text-center">
        <p className="text-white/40 text-xs">
          &copy; {new Date().getFullYear()} Roofing Association of New Zealand.
          All rights reserved.
        </p>
      </footer>
    </div>
  );
}
