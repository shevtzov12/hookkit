import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#0c0e12] p-6">
      <SignUp />
    </div>
  );
}
