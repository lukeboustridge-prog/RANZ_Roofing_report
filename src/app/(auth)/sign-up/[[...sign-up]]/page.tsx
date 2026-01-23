import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp
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
