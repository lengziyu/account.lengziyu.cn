"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  LogOut,
  LayoutGrid,
  Star,
  Tags,
  User,
  ChevronRight,
  Smartphone,
  BellRing,
  CreditCard,
} from "lucide-react";

interface StatsData {
  totalItems: number;
  totalFavorites: number;
  totalTags: number;
  totalSubscriptions?: number;
  dueSubscriptions?: number;
}

function AnimatedCount({ value, suffix }: { value?: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);

  useEffect(() => {
    if (typeof value !== "number") return;

    const startValue = previousValueRef.current;
    const delta = value - startValue;
    const duration = 700;
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + delta * eased);
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        previousValueRef.current = value;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <>
      {displayValue}
      {suffix || ""}
    </>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      void fetchStats();
    }
  }, [status, router]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        setStats(await res.json());
      }
    } finally {
      setLoadingStats(false);
    }
  };

  const statCards = [
    {
      icon: <LayoutGrid className="w-5 h-5" />,
      iconClassName: "text-brandIndigo",
      value: stats?.totalItems,
      label: "库内记录",
      onClick: () => router.push("/dashboard"),
    },
    {
      icon: <Tags className="w-5 h-5" />,
      iconClassName: "text-emerald-500",
      value: stats?.totalTags,
      label: "平台标签",
      onClick: () => router.push("/settings/platforms"),
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      iconClassName: "text-sky-500",
      value: stats?.totalSubscriptions,
      label: "订阅数",
      onClick: () => router.push("/subscriptions"),
    },
    {
      icon: <BellRing className="w-5 h-5" />,
      iconClassName: "text-orange-500",
      value: stats?.dueSubscriptions,
      label: "即将到期数",
      onClick: () => router.push("/subscriptions"),
    },
  ];

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-transparent px-4 py-8">
        <div className="mx-auto max-w-[900px] space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fafc_42%,#f3f0ff_100%)] px-4 py-6 transition-colors dark:bg-[radial-gradient(circle_at_top,#1c2238_0%,#171b2b_48%,#1a1630_100%)]">
      <div className="mx-auto w-full max-w-[900px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-gray-900 dark:text-textPrimary">个人中心</h1>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-textSecondary">常用入口和账号概览。</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mb-3 rounded-xl border border-white/70 bg-white/75 p-2.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brandIndigo/12 text-brandIndigo dark:bg-brandIndigo/20">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-500 dark:text-textTertiary">当前登录账号</p>
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-textPrimary">
                {session.user?.email || "未知用户"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/dashboard?tag=${encodeURIComponent("收藏")}`)}
              className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-2 text-xs text-orange-700 transition hover:bg-orange-100 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/15"
            >
              <Star className="h-4 w-4" fill="currentColor" />
              <span className="font-medium">
                <AnimatedCount value={stats?.totalFavorites} />
              </span>
              <span className="hidden sm:inline">特别收藏</span>
            </button>
          </div>
        </div>

        <div className="mb-4">
          {loadingStats || !stats ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[76px] w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {statCards.map((card, index) => (
                <button
                  key={card.label}
                  type="button"
                  onClick={card.onClick}
                  className="rounded-xl border border-white/70 bg-white/75 p-2.5 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-transparent"
                  style={{ animation: `fade-in-up 520ms ease-out ${index * 70}ms both` }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={card.iconClassName}>{card.icon}</div>
                    <div className="text-base font-semibold leading-none text-gray-900 dark:text-textPrimary">
                      <AnimatedCount value={card.value} />
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-700 dark:text-textSecondary">{card.label}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push("/settings/phones")}
            className="flex w-full items-center justify-between rounded-xl border border-white/70 bg-white/75 px-4 py-4 text-gray-800 shadow-sm backdrop-blur transition hover:bg-white/90 dark:border-white/10 dark:bg-transparent dark:text-textPrimary dark:hover:bg-white/10"
          >
            <span className="inline-flex items-center">
              <Smartphone className="mr-2 h-5 w-5 text-brandIndigo" />
              手机号管理
            </span>
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-textTertiary" />
          </button>

          <button
            onClick={() => router.push("/settings/platforms")}
            className="flex w-full items-center justify-between rounded-xl border border-white/70 bg-white/75 px-4 py-4 text-gray-800 shadow-sm backdrop-blur transition hover:bg-white/90 dark:border-white/10 dark:bg-transparent dark:text-textPrimary dark:hover:bg-white/10"
          >
            <span className="inline-flex items-center">
              <Tags className="mr-2 h-5 w-5 text-brandIndigo" />
              常用平台管理
            </span>
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-textTertiary" />
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center justify-center rounded-xl bg-red-50 px-4 py-4 font-medium text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            <LogOut className="mr-2 h-5 w-5" />
            安全退出当前账号
          </button>
        </div>
      </div>
    </div>
  );
}
