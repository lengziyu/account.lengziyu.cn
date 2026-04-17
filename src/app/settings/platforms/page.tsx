"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Pencil, Tags, Trash2, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";

type TagPreset = { id: string; name: string; builtin: boolean };
type TagResponse = { presets?: TagPreset[] };

async function getErrorMessage(res: Response, fallback: string) {
  const text = (await res.text()).trim();
  return text || fallback;
}

export default function PlatformSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tagPresets, setTagPresets] = useState<TagPreset[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      void fetchTags();
    }
  }, [status, router]);

  const builtinPresets = useMemo(
    () => tagPresets.filter((item) => item.builtin),
    [tagPresets]
  );
  const customPresets = useMemo(
    () => tagPresets.filter((item) => !item.builtin),
    [tagPresets]
  );

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const fetchTags = async () => {
    setLoading(true);
    clearMessages();
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) {
        setError(await getErrorMessage(res, "读取平台失败"));
        return;
      }
      const data = (await res.json()) as TagResponse;
      setTagPresets(data.presets || []);
    } catch {
      setError("读取平台失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const name = newTagName.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    clearMessages();
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, "新增失败"));
        return;
      }
      setNewTagName("");
      setSuccess("新增成功");
      await fetchTags();
    } catch {
      setError("新增失败");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (id: string, name: string) => {
    setEditingTagId(id);
    setEditingTagName(name);
    clearMessages();
  };

  const cancelEdit = () => {
    setEditingTagId(null);
    setEditingTagName("");
    clearMessages();
  };

  const handleUpdate = async () => {
    if (!editingTagId || submitting) return;
    const name = editingTagName.trim();
    if (!name) return;
    setSubmitting(true);
    clearMessages();
    try {
      const res = await fetch("/api/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTagId, name }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, "修改失败"));
        return;
      }
      setEditingTagId(null);
      setEditingTagName("");
      setSuccess("修改成功");
      await fetchTags();
    } catch {
      setError("修改失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (submitting) return;
    if (!confirm(`确定删除平台「${name}」吗？`)) return;

    setSubmitting(true);
    clearMessages();
    try {
      const res = await fetch(`/api/tags?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, "删除失败"));
        return;
      }

      if (editingTagId === id) {
        setEditingTagId(null);
        setEditingTagName("");
      }
      setSuccess("删除成功");
      await fetchTags();
    } catch {
      setError("删除失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center transition-colors">
        <svg
          className="animate-spin h-8 w-8 text-brandIndigo"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center pt-8 md:pt-12 px-4 transition-colors">
      <div className="w-full max-w-[560px]">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="inline-flex items-center text-sm text-gray-600 dark:text-textSecondary hover:text-brandIndigo transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回个人中心
          </button>
          <ThemeToggle />
        </div>

        <div className="bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)] rounded-[16px] p-6 shadow-sm">
          <h1 className="text-[24px] font-semibold text-gray-900 dark:text-textPrimary tracking-tight flex items-center">
            <Tags className="w-5 h-5 mr-2 text-brandIndigo" />
            常用平台管理
          </h1>
          <p className="text-xs text-gray-500 dark:text-textTertiary mt-2 mb-4">
            内置平台不可修改；你新增的平台可以修改和删除。
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {builtinPresets.map((item) => (
              <span
                key={item.id}
                className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-[rgba(255,255,255,0.08)] text-gray-600 dark:text-textSecondary"
              >
                {item.name}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="新增平台标签"
              className="flex-1 min-w-[180px] px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[rgba(255,255,255,0.02)]"
            />
            <Button type="button" variant="outline" onClick={handleCreate} disabled={submitting}>
              新增
            </Button>
          </div>

          {error ? (
            <div className="text-xs text-red-500 mb-3">{error}</div>
          ) : null}
          {success ? (
            <div className="text-xs text-green-600 mb-3">{success}</div>
          ) : null}

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-textTertiary">加载中...</p>
          ) : customPresets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-textTertiary">
              还没有自定义平台，先新增一个吧。
            </p>
          ) : (
            <div className="space-y-2">
              {customPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-2 text-sm rounded-lg border border-gray-100 dark:border-[rgba(255,255,255,0.08)] px-3 py-2"
                >
                  {editingTagId === preset.id ? (
                    <>
                      <input
                        type="text"
                        value={editingTagName}
                        onChange={(e) => setEditingTagName(e.target.value)}
                        className="flex-1 px-2 py-1 rounded border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[rgba(255,255,255,0.02)]"
                      />
                      <button
                        type="button"
                        onClick={handleUpdate}
                        className="inline-flex items-center text-brandIndigo"
                        disabled={submitting}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center text-gray-500"
                        disabled={submitting}
                      >
                        <X className="w-4 h-4 mr-1" />
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-700 dark:text-textPrimary">
                        {preset.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(preset.id, preset.name)}
                        className="inline-flex items-center text-brandIndigo"
                        disabled={submitting}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        修改
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(preset.id, preset.name)}
                        className="inline-flex items-center text-red-500"
                        disabled={submitting}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
