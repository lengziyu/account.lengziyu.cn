import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm"

export default function NewSubscriptionPage() {
  return (
    <SubscriptionForm
      mode="create"
      title="新增订阅"
      description="把会员、年费服务、自动续费项目统一录入，后续就能在到期前集中提醒。"
    />
  )
}
