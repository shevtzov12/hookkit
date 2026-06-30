import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#0c0e12] p-6">
      <SignIn />
    </div>
  );
}
