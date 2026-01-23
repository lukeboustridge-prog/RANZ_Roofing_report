export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100">
      <div className="text-center space-y-8 px-4">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#2d5c8f] text-white text-2xl font-bold">
            R
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            RANZ Roofing Reports
          </h1>
          <p className="text-xl text-gray-600 max-w-md mx-auto">
            Professional roofing inspection reports for RANZ certified inspectors
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/sign-in"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-[#2d5c8f] rounded-lg hover:bg-[#1a3a5c] transition-colors cursor-pointer no-underline"
            role="button"
          >
            Sign In
          </a>
          <a
            href="/sign-up"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-[#2d5c8f] bg-white border border-[#2d5c8f] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer no-underline"
            role="button"
          >
            Create Account
          </a>
        </div>
      </div>
    </div>
  );
}
