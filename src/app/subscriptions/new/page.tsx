import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm"

export default function NewSubscriptionPage() {
  return (
    <SubscriptionForm
      mode="create"
      title="新增订阅"
      description="先选关联账号，再补充到期时间和提醒决策。"
    />
  )
}
