"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogOut, LayoutGrid, Star, Tags, Layers, User } from "lucide-react";

interface StatsData {
  totalItems: number;
  totalFavorites: number;
  totalTags: number;
  totalCategories: number;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchStats();
    }
  }, [status, router]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {}
  };

  if (status === "loading" || !session) return (
    <div className="min-h-screen bg-transparent flex items-center justify-center transition-colors">
      <svg className="animate-spin h-8 w-8 text-brandIndigo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center pt-8 md:pt-16 px-4 transition-colors">
      <div className="w-full max-w-[500px]">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-[32px] font-semibold text-gray-900 dark:text-textPrimary tracking-tight">个人中心</h1>
          <ThemeToggle />
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)] rounded-[16px] p-6 mb-6 shadow-sm flex items-center space-x-4">
          <div className="w-14 h-14 bg-brandIndigo/10 dark:bg-brandIndigo/20 flex items-center justify-center rounded-full text-brandIndigo">
            <User className="w-7 h-7" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[13px] text-gray-500 dark:text-textTertiary mb-1">当前登录账号</p>
            <p className="text-[16px] font-semibold text-gray-900 dark:text-textPrimary truncate">
              {session.user?.email || "未知用户"}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <h2 className="text-[14px] font-[510] text-gray-500 dark:text-textSecondary mb-4">库内记录雷达</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)] rounded-[16px] p-5 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="flex justify-center mb-2 text-brandIndigo"><LayoutGrid className="w-5 h-5" /></div>
            <div className="text-[28px] font-bold text-gray-900 dark:text-textPrimary leading-none mb-1">{stats?.totalItems ?? "-"}</div>
            <div className="text-[12px] text-gray-500 dark:text-textTertiary">总记录数</div>
          </div>
          <div className="bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)] rounded-[16px] p-5 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="flex justify-center mb-2 text-red-500"><Star className="w-5 h-5" fill="currentColor" /></div>
            <div className="text-[28px] font-bold text-gray-900 dark:text-textPrimary leading-none mb-1">{stats?.totalFavorites ?? "-"}</div>
            <div className="text-[12px] text-gray-500 dark:text-textTertiary">特别收藏</div>
          </div>
          <div className="bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)] rounded-[16px] p-5 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="flex justify-center mb-2 text-green-500"><Tags className="w-5 h-5" /></div>
            <div className="text-[28px] font-bold text-gray-900 dark:text-textPrimary leading-none mb-1">{stats?.totalTags ?? "-"}</div>
            <div className="text-[12px] text-gray-500 dark:text-textTertiary">使用分类标签数</div>
          </div>
          <div className="bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)] rounded-[16px] p-5 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="flex justify-center mb-2 text-orange-500"><Layers className="w-5 h-5" /></div>
            <div className="text-[28px] font-bold text-gray-900 dark:text-textPrimary leading-none mb-1">{stats?.totalCategories ?? "-"}</div>
            <div className="text-[12px] text-gray-500 dark:text-textTertiary">大库总维度</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => router.push("/settings/platforms")}
            className="w-full bg-white hover:bg-gray-50 dark:bg-[rgba(255,255,255,0.03)] dark:hover:bg-[rgba(255,255,255,0.06)] text-gray-800 dark:text-textPrimary border border-gray-100 dark:border-[rgba(255,255,255,0.08)] font-medium py-4 px-4 rounded-[12px] transition-colors flex items-center justify-between shadow-sm dark:shadow-none"
          >
            <span className="inline-flex items-center">
              <Tags className="w-5 h-5 mr-2 text-brandIndigo" />
              常用平台管理
            </span>
            <span className="text-xs text-gray-500 dark:text-textTertiary">新增 / 修改 / 删除</span>
          </button>

          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium py-4 px-4 rounded-[12px] transition-colors flex items-center justify-center shadow-sm dark:shadow-none"
          >
            <LogOut className="w-5 h-5 mr-2" />
            安全退出当前账号
          </button>
        </div>
        
      </div>
    </div>
  );
}
