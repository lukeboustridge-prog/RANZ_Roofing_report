import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: "bg-[var(--ranz-blue-500)] hover:bg-[var(--ranz-blue-600)]",
            card: "shadow-lg",
          },
        }}
      />
    </div>
  );
}
