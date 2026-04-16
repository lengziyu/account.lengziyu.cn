"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

import { Fingerprint } from "lucide-react";

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
      setError("Invalid account or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-marketingBlack p-4 transition-colors">
      <div className="w-full max-w-[400px] p-8 rounded-[24px] bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] shadow-xl shadow-brandIndigo/5 dark:shadow-none">
        
        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-[16px] bg-gradient-to-br from-brandIndigo to-accentHover flex items-center justify-center shadow-lg shadow-brandIndigo/30">
            <Fingerprint className="w-9 h-9 text-white" />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-bold text-gray-900 dark:text-textPrimary tracking-tight mb-2">My Vault</h1>
          <p className="text-gray-500 dark:text-textSecondary text-[14px]">安全的私人账号库</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-[510] text-gray-700 dark:text-textSecondary mb-2">账号</label>
            <input 
              type="text" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-[6px] px-3 py-2 text-gray-900 dark:text-textPrimary focus:outline-none focus:border-brandIndigo transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-[510] text-gray-700 dark:text-textSecondary mb-2">密码</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-[6px] px-3 py-2 text-gray-900 dark:text-textPrimary focus:outline-none focus:border-brandIndigo transition-colors"
              required
            />
          </div>
          {error && <p className="text-[#e5484d] text-[13px]">{error}</p>}
          <Button variant="brand" className="w-full mt-4" type="submit">
            继续
          </Button>
        </form>
      </div>
    </div>
  );
}
