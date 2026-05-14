"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type PhoneIdentity = {
  id: string;
  name: string;
  identifier: string;
  notes?: string | null;
};

type EditingPhone = {
  id: string;
  name: string;
  identifier: string;
  notes: string;
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
  const [editing, setEditing] = useState<EditingPhone | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingPhone, setDeletingPhone] = useState<PhoneIdentity | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

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

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const hasFormValue =
    !!editing ||
    !!form.name.trim() ||
    !!form.identifier.trim() ||
    !!form.notes.trim();

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
      setSuccess("手机号已添加");
      await fetchPhones();
    } catch {
      setError("新增手机号失败");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (phone: PhoneIdentity) => {
    setEditing({
      id: phone.id,
      name: phone.name,
      identifier: phone.identifier,
      notes: phone.notes || "",
    });
    clearMessages();
  };

  const handleUpdate = async () => {
    if (!editing || submitting) return;

    const name = editing.name.trim();
    const identifier = editing.identifier.trim();
    if (!name || !identifier) return;

    setSubmitting(true);
    clearMessages();
    try {
      const res = await fetch("/api/identities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          kind: "phone",
          name,
          identifier,
          notes: editing.notes.trim(),
        }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, "更新手机号失败"));
        return;
      }
      resetForm();
      setSuccess("手机号已更新");
      await fetchPhones();
    } catch {
      setError("更新手机号失败");
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
      if (editing?.id === deletingPhone.id) {
        resetForm();
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

        <div className="rounded-[18px] border border-gray-100 bg-white p-6 shadow-sm dark:border-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.03)] dark:shadow-none">
          <h1 className="flex items-center text-[24px] font-semibold tracking-tight text-gray-900 dark:text-textPrimary">
            <Phone className="w-5 h-5 mr-2 text-brandIndigo" />
            手机号管理
          </h1>
          <p className="mt-2 text-xs text-gray-500 dark:text-textTertiary">
            这里维护常用手机号，创建或编辑账号时可以直接选择绑定。
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={editing ? editing.name : form.name}
              onChange={(event) =>
                editing
                  ? setEditing((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                  : setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="显示名称，例如 国内主号"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
            />
            <input
              type="text"
              value={editing ? editing.identifier : form.identifier}
              onChange={(event) =>
                editing
                  ? setEditing((prev) => (prev ? { ...prev, identifier: event.target.value } : prev))
                  : setForm((prev) => ({ ...prev, identifier: event.target.value }))
              }
              placeholder="手机号，例如 +86 13800000000"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
            />
            <textarea
              rows={3}
              value={editing ? editing.notes : form.notes}
              onChange={(event) =>
                editing
                  ? setEditing((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                  : setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              placeholder="备注，例如 用于注册海外服务"
              className="sm:col-span-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.02)] dark:text-textPrimary"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" variant="brand" onClick={editing ? handleUpdate : handleCreate} disabled={submitting}>
              {editing ? "保存修改" : "新增手机号"}
            </Button>
            <Button
              type="button"
              variant="warning"
              onClick={() => {
                if (!hasFormValue) {
                  resetForm();
                  return;
                }
                setConfirmingClear(true);
              }}
              disabled={submitting}
            >
              {editing ? "取消编辑" : "清空"}
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
                还没有手机号，先添加一个吧。
              </div>
            ) : (
              phones.map((phone) => (
                <button
                  key={phone.id}
                  type="button"
                  onClick={() => startEdit(phone)}
                  disabled={submitting}
                  className="relative flex w-full flex-col gap-3 rounded-2xl border border-gray-200 px-4 py-4 text-left transition hover:border-brandIndigo/40 hover:bg-gray-50/60 dark:border-[rgba(255,255,255,0.08)] dark:hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
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
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeletingPhone(phone);
                      clearMessages();
                    }}
                    disabled={submitting}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingClear}
        title={editing ? "取消当前编辑" : "清空手机号表单"}
        description={editing ? "当前修改内容会被丢弃，确认取消编辑吗？" : "当前填写的手机号内容会被清空，确认继续吗？"}
        confirmLabel={editing ? "确认取消" : "确认清空"}
        tone="warning"
        busy={submitting}
        onCancel={() => setConfirmingClear(false)}
        onConfirm={() => {
          resetForm();
          setConfirmingClear(false);
        }}
      />

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
