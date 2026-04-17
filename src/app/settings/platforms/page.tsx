"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert, Tags, X } from "lucide-react";
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
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [deletingTag, setDeletingTag] = useState<{ id: string; name: string } | null>(null);
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
    setEditingTag({ id, name });
    setEditingTagName(name);
    clearMessages();
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setEditingTagName("");
  };

  const handleUpdate = async () => {
    if (!editingTag || submitting) return;
    const name = editingTagName.trim();
    if (!name) return;
    setSubmitting(true);
    clearMessages();
    try {
      const res = await fetch("/api/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTag.id, name }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, "修改失败"));
        return;
      }
      setEditingTag(null);
      setEditingTagName("");
      setSuccess("修改成功");
      await fetchTags();
    } catch {
      setError("修改失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (submitting || !deletingTag) return;
    setSubmitting(true);
    clearMessages();
    try {
      const res = await fetch(`/api/tags?id=${encodeURIComponent(deletingTag.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, "删除失败"));
        return;
      }

      if (editingTag?.id === deletingTag.id) {
        setEditingTag(null);
        setEditingTagName("");
      }
      setDeletingTag(null);
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
          <p className="text-xs text-gray-500 dark:text-textTertiary mt-2 mb-4">支持新增、修改、删除。</p>

          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="请输入平台名称"
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
          ) : tagPresets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-textTertiary">
              还没有平台，先新增一个吧。
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {tagPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() => startEdit(preset.id, preset.name)}
                    disabled={submitting}
                    className="px-4 py-2 pr-8 text-sm rounded-full border border-gray-200 dark:border-[rgba(255,255,255,0.12)] bg-gray-50 dark:bg-[rgba(255,255,255,0.03)] text-gray-700 dark:text-textPrimary hover:border-brandIndigo/60 hover:text-brandIndigo transition-colors disabled:opacity-60"
                  >
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`删除 ${preset.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingTag({ id: preset.id, name: preset.name });
                      clearMessages();
                    }}
                    disabled={submitting}
                    className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 shadow-sm hover:bg-red-50 dark:border-red-400/40 dark:bg-[#1f1f24] dark:text-red-300 dark:hover:bg-red-500/10 disabled:opacity-60"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingTag ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={submitting ? undefined : cancelEdit}
            aria-label="关闭修改弹窗"
          />
          <div className="relative w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-7 shadow-2xl dark:border-[rgba(255,255,255,0.15)] dark:bg-[#1b1c21]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-textPrimary">修改平台</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-textTertiary">点击保存后，相关记录会同步更新为新名称。</p>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={submitting}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.15)] dark:text-textSecondary dark:hover:bg-[rgba(255,255,255,0.05)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-textSecondary">平台名称</label>
            <input
              type="text"
              value={editingTagName}
              onChange={(e) => setEditingTagName(e.target.value)}
              placeholder="请输入平台名称"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 outline-none transition-colors focus:border-brandIndigo dark:border-[rgba(255,255,255,0.15)] dark:bg-[rgba(255,255,255,0.04)] dark:text-textPrimary"
              autoFocus
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={cancelEdit} disabled={submitting}>
                取消
              </Button>
              <Button type="button" variant="brand" onClick={handleUpdate} disabled={submitting}>
                {submitting ? "保存中..." : "保存修改"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingTag ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
            onClick={submitting ? undefined : () => setDeletingTag(null)}
            aria-label="关闭删除确认弹窗"
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-red-100 bg-white p-7 shadow-2xl dark:border-red-400/30 dark:bg-[#1b1c21]">
            <div className="mb-4 flex items-center gap-3 text-red-600 dark:text-red-300">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/15">
                <CircleAlert className="h-5 w-5" />
              </span>
              <h2 className="text-2xl font-semibold">删除平台</h2>
            </div>
            <p className="text-sm leading-6 text-gray-600 dark:text-textSecondary">
              确定删除平台「{deletingTag.name}」吗？删除后，使用该平台标签的记录会同步清理该标签。
            </p>
            <div className="mt-7 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDeletingTag(null)} disabled={submitting}>
                取消
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-[14px] font-[510] text-white transition-colors hover:bg-red-500 disabled:pointer-events-none disabled:opacity-50"
              >
                {submitting ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
