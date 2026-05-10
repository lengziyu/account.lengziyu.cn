"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm"

type SubscriptionDetail = {
  id: string
  vaultItemId?: string | null
  platformName: string
  planName: string
  status: string
  decision: string
  startedAt?: string | null
  expiresAt?: string | null
  renewalCycle?: string | null
  price?: number | null
  currency?: string | null
  autoRenew: boolean
  notes?: string | null
  reminderRules: { id: string; daysBefore: number; enabled: boolean }[]
  defaultReminderDays?: number[]
  dispatchLogs: {
    id: string
    channelType: string
    status: string
    daysBefore: number
    triggerDateKey: string
    payloadSnapshot?: string | null
    errorMessage?: string | null
    sentAt?: string | null
    createdAt?: string | null
  }[]
}

export default function SubscriptionDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<SubscriptionDetail | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    void fetchDetail()
  }, [id])

  const fetchDetail = async () => {
    const res = await fetch(`/api/subscriptions/${id}`)
    if (!res.ok) {
      setError("无法读取订阅详情")
      return
    }
    setData(await res.json())
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-brandIndigo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <SubscriptionForm
      mode="edit"
      title="编辑订阅"
      description="调整到期时间、提醒规则和当前续费决策。"
      value={{
        id: data.id,
        vaultItemId: data.vaultItemId,
        platformName: data.platformName,
        planName: data.planName,
        status: data.status,
        decision: data.decision,
        startedAt: data.startedAt,
        expiresAt: data.expiresAt,
        renewalCycle: data.renewalCycle,
        price: data.price,
        currency: data.currency,
        autoRenew: data.autoRenew,
        notes: data.notes,
        reminderDays: data.reminderRules.map((rule) => rule.daysBefore),
      }}
      defaultReminderDays={data.defaultReminderDays}
      logs={data.dispatchLogs}
    />
  )
}
