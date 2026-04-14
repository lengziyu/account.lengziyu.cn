"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface VaultItem {
  id: string;
  title: string;
  platform: string | null;
  username: string | null;
  favorite: boolean;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<VaultItem[]>([]);

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

  if (status === "loading") return <div className="p-8 text-textSecondary">Loading vault...</div>;

  const favorites = items.filter(item => item.favorite);

  return (
    <div className="min-h-screen bg-marketingBlack flex flex-col items-center pt-16 px-4">
      <div className="w-full max-w-[800px]">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-[32px] font-[510] tracking-[-0.704px]">Vault</h1>
          <Button variant="brand" onClick={() => router.push("/items/new")}>
            New Item
          </Button>
        </div>

        <div className="mb-8">
          <input 
            type="text" 
            placeholder="Search items..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-4 py-3 text-[15px] font-[400] text-textPrimary placeholder:text-textTertiary focus:outline-none focus:border-[rgba(255,255,255,0.15)] transition-colors linear-shadow-focus"
          />
        </div>

        {favorites.length > 0 && !search && (
          <div className="mb-8">
            <h2 className="text-[14px] font-[510] text-textSecondary tracking-[-0.182px] mb-4">Favorites</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map(item => (
                <div key={item.id} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.05)] transition-colors rounded-[8px] p-4 cursor-pointer" onClick={() => router.push(`/items/${item.id}`)}>
                  <div className="text-[15px] font-[510] text-textPrimary">{item.title}</div>
                  <div className="text-[13px] text-textTertiary mt-1">{item.platform || "No platform"} • {item.username || "No username"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-[14px] font-[510] text-textSecondary tracking-[-0.182px] mb-4">All Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.05)] transition-colors rounded-[8px] p-4 cursor-pointer" onClick={() => router.push(`/items/${item.id}`)}>
                <div className="text-[15px] font-[510] text-textPrimary">{item.title}</div>
                <div className="text-[13px] text-textTertiary mt-1">{item.platform || "No platform"} • {item.username || "No username"}</div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-[13px] text-textTertiary col-span-2">No items found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
