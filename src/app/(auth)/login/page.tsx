"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-marketingBlack p-4">
      <div className="w-full max-w-[400px] p-8 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)]">
        <div className="mb-8">
          <h1 className="text-[32px] font-[510] tracking-[-0.704px] text-textPrimary mb-2">Sign in</h1>
          <p className="text-textSecondary text-[15px]">Welcome back to Vault.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-[510] text-textSecondary mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-3 py-2 text-textPrimary focus:outline-none focus:border-[rgba(255,255,255,0.15)] transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-[510] text-textSecondary mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-3 py-2 text-textPrimary focus:outline-none focus:border-[rgba(255,255,255,0.15)] transition-colors"
              required
            />
          </div>
          {error && <p className="text-[#e5484d] text-[13px]">{error}</p>}
          <Button variant="brand" className="w-full mt-4" type="submit">
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
