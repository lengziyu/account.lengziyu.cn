"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type PhoneIdentity = {
  id: string;
  name: string;
  identifier: string;
  notes?: string | null;
};

async function getErrorMessage(res: Response, fallback: string) {
  const text = (await res.text()).trim();
  return text || fallback;
}

const emptyForm = {
  name: "",
  identifier: "",
  notes: "",
};

export default function PhoneSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [phones, setPhones] = useState<PhoneIdentity[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingPhone, setDeletingPhone] = useState<PhoneIdentity | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      void fetchPhones();
    }
  }, [router, status]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const fetchPhones = async () => {
    setLoading(true);
    clearMessages();
    try {
      const res = await fetch("/api/identities?kind=phone");
      if (!res.ok) {
        setError(await getErrorMessage(res, "读取手机号失败"));
        return;
      }
      setPhones(await res.json());
    } catch {
      setError("读取手机号失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const name = form.name.trim();
    const identifier = form.identifier.trim();
    if (!identifier || submitting) return;

    setSubmitting(true);
    clearMessages();
    try {
      const res = await fetch("/api/identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "phone",
          name: name || identifier,
          identifier,
          notes: form.notes.trim(),
        }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, "新增手机号失败"));
        return;
      }
      resetForm();
      setShowCreateModal(false);
      setSuccess("手机号已添加");
      await fetchPhones();
    } catch {
      setError("新增手机号失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPhone) return;
    setSubmitting(true);
    clearMessages();
    try {
      const res = await fetch(`/api/identities?id=${encodeURIComponent(deletingPhone.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, "删除手机号失败"));
        return;
      }
      setDeletingPhone(null);
      setSuccess("手机号已删除");
      await fetchPhones();
    } catch {
      setError("删除手机号失败");
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
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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
    <div className="w-full flex flex-col items-center px-4 pb-28 pt-8 transition-colors md:pt-12">
      <div className="w-full max-w-[640px]">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="rounded-full p-1.5 -ml-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-brandIndigo dark:text-textSecondary dark:hover:bg-[rgba(255,255,255,0.05)]"
            aria-label="返回个人中心"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-textPrimary">手机号管理</h1>
        </div>

        <div className="rounded-[18px] border border-gray-100 bg-white p-6 shadow-sm dark:border-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.03)] dark:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center text-[24px] font-semibold tracking-tight text-gray-900 dark:text-textPrimary">
                <Phone className="w-5 h-5 mr-2 text-brandIndigo" />
                手机号管理
              </h2>
              <p className="mt-2 text-xs text-gray-500 dark:text-textTertiary">
                这里维护常用手机号，创建或编辑账号时可以直接选择绑定。
              </p>
            </div>
            <Button
              type="button"
              variant="brand"
              onClick={() => {
                clearMessages();
                resetForm();
                setShowCreateModal(true);
              }}
              disabled={submitting}
            >
              <Plus className="mr-1 h-4 w-4" />
              新增手机号
            </Button>
          </div>

          {error ? <div className="mt-4 text-sm text-red-500">{error}</div> : null}
          {success ? <div className="mt-4 text-sm text-emerald-600">{success}</div> : null}

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-500 dark:bg-white/5 dark:text-textSecondary">
                加载中...
              </div>
            ) : phones.length === 0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-500 dark:bg-white/5 dark:text-textSecondary">
                还没有手机号，点击右上角先添加一个吧。
              </div>
            ) : (
              phones.map((phone) => (
                <div
                  key={phone.id}
                  className="relative flex w-full flex-col gap-3 rounded-2xl border border-gray-200 px-4 py-4 text-left dark:border-[rgba(255,255,255,0.08)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-textPrimary">{phone.name}</div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-textSecondary">{phone.identifier}</div>
                    {phone.notes ? (
                      <div className="mt-1 text-xs text-gray-500 dark:text-textTertiary">{phone.notes}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={`删除 ${phone.identifier}`}
                    onClick={() => {
                      setDeletingPhone(phone);
                      clearMessages();
                    }}
                    disabled={submitting}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={submitting ? undefined : () => setShowCreateModal(false)}
            aria-label="关闭新增手机号弹窗"
          />
          <div className="relative w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-7 shadow-2xl dark:border-[rgba(255,255,255,0.15)] dark:bg-[#1b1c21]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-textPrimary">新增手机号</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-textTertiary">新增后可在账号创建与编辑时直接绑定。</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.15)] dark:text-textSecondary dark:hover:bg-[rgba(255,255,255,0.05)]"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="显示名称，例如 国内主号"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
              />
              <input
                type="text"
                value={form.identifier}
                onChange={(event) => setForm((prev) => ({ ...prev, identifier: event.target.value }))}
                placeholder="手机号，例如 +86 13800000000"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
              />
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="备注，例如 用于注册海外服务"
                className="sm:col-span-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={submitting}>
                取消
              </Button>
              <Button type="button" variant="brand" onClick={handleCreate} disabled={submitting || !form.identifier.trim()}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!deletingPhone}
        title="删除手机号"
        description={deletingPhone ? `确定删除手机号「${deletingPhone.identifier}」吗？删除后，绑定它的账号将失去这条手机号关联。` : ""}
        confirmLabel="确认删除"
        tone="danger"
        busy={submitting}
        onCancel={() => setDeletingPhone(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
