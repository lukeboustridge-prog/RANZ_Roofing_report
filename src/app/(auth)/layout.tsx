/**
 * Auth Layout
 * Layout for authentication pages (sign-in, sign-up)
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100">
      {children}
    </div>
  );
}
