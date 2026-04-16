"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { User, KeyRound, CheckCircle2, Fingerprint } from "lucide-react";

interface VaultItem {
  id: string;
  title: string;
  password?: string;
  favorite: boolean;
  tags?: { id: string, tag: string }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchItems();
    }
  }, [status, search]);

  const fetchItems = async () => {
    const res = await fetch(`/api/items?search=${encodeURIComponent(search)}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data);
    }
  };

  const copyToClipboard = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (status === "loading") return (
    <div className="min-h-screen bg-transparent flex items-center justify-center transition-colors">
      <svg className="animate-spin h-8 w-8 text-brandIndigo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );

  const favorites = items.filter(item => item.favorite);

  const renderItemCard = (item: VaultItem) => (
    <div 
      key={item.id} 
      className="group bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)] hover:border-gray-200 dark:hover:bg-[rgba(255,255,255,0.05)] shadow-sm dark:shadow-none transition-all rounded-[12px] p-4 cursor-pointer flex flex-col justify-center relative overflow-hidden" 
      onClick={() => router.push(`/items/${item.id}`)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-[15px] font-[510] text-gray-900 dark:text-textPrimary truncate">{item.title}</div>
        
        {/* Quick Actions (Always Visible, Better contrast) */}
        <div className="flex items-center space-x-2 shrink-0 ml-3">
          <button
            type="button"
            onClick={(e) => copyToClipboard(e, item.title, `account-${item.id}`)}
            className="flex items-center p-2 bg-gray-100 hover:bg-gray-200 dark:bg-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.15)] rounded-md text-gray-700 dark:text-gray-300 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-[rgba(255,255,255,0.2)] shadow-sm"
            title="复制账号"
          >
            {copiedId === `account-${item.id}` ? <CheckCircle2 className="w-4 h-4 text-statusGreen" /> : <User className="w-4 h-4 text-brandIndigo" />}
          </button>
          
          {item.password && (
            <button
              type="button"
              onClick={(e) => copyToClipboard(e, item.password!, `pwd-${item.id}`)}
              className="flex items-center p-2 bg-gray-100 hover:bg-gray-200 dark:bg-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.15)] rounded-md text-gray-700 dark:text-gray-300 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-[rgba(255,255,255,0.2)] shadow-sm"
              title="复制密码"
            >
              {copiedId === `pwd-${item.id}` ? <CheckCircle2 className="w-4 h-4 text-statusGreen" /> : <KeyRound className="w-4 h-4 text-brandIndigo" />}
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1">
        {item.tags && item.tags.length > 0 ? (
          item.tags.map((t: any) => (
            <span key={t.id} className="px-2 py-0.5 text-xs bg-brandIndigo/10 dark:bg-brandIndigo/20 text-brandIndigo dark:text-accentHover rounded">
              {t.tag}
            </span>
          ))
        ) : (
          <span className="text-[13px] text-gray-500 dark:text-textTertiary">无标签</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center pt-8 md:pt-12 px-4 transition-colors">
      <div className="w-full max-w-[800px]">
        <div className="flex justify-between items-center mb-8 md:mb-12">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brandIndigo to-accentHover flex items-center justify-center shadow-md shadow-brandIndigo/20">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-[28px] font-bold text-gray-900 dark:text-textPrimary drop-shadow-sm tracking-tight">我的保险库</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="mb-8">
          <input 
            type="text" 
            placeholder="搜索账号名、标签或备注..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-[12px] px-5 py-4 text-[15px] font-[400] text-gray-900 dark:text-textPrimary placeholder-gray-400 dark:placeholder:text-textTertiary focus:outline-none focus:ring-2 focus:ring-brandIndigo focus:border-transparent transition-all shadow-sm dark:shadow-none"
          />
        </div>

        {favorites.length > 0 && !search && (
          <div className="mb-10">
            <h2 className="text-[14px] font-[510] text-gray-400 dark:text-textSecondary mb-4 flex items-center">
              <span className="text-red-500 mr-2 border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-500/10 p-1 rounded-full"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
              收藏组合
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map(renderItemCard)}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-[14px] font-[510] text-gray-400 dark:text-textSecondary mb-4">全部列表</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(renderItemCard)}
            {items.length === 0 && (
              <div className="text-[13px] text-gray-500 dark:text-textTertiary col-span-2 py-8 text-center bg-[rgba(255,255,255,0.5)] dark:bg-[rgba(255,255,255,0.01)] rounded-2xl border border-dashed border-gray-200 dark:border-[rgba(255,255,255,0.1)]">
                没有找到匹配的记录。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
