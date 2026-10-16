'use client'

import * as Tabs from '@radix-ui/react-tabs'

interface Order {
  id: string
  registrationId: string
  amount: string
  currency: string
  createdAt: string
}

interface PaymentsTabsProps {
  guildId: string
  collections: Order[]
  pending: Order[]
  failed: Order[]
  refunds: Order[]
}

function OrderTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <p className="text-white/50 text-sm py-4">No orders yet.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            <th className="pb-2 pr-4 font-medium">Order ID</th>
            <th className="pb-2 pr-4 font-medium">Registration ID</th>
            <th className="pb-2 pr-4 font-medium">Amount</th>
            <th className="pb-2 pr-4 font-medium">Currency</th>
            <th className="pb-2 font-medium">Created At</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-white/5 text-white/80">
              <td className="py-2 pr-4 font-mono text-xs">{o.id}</td>
              <td className="py-2 pr-4 font-mono text-xs">{o.registrationId}</td>
              <td className="py-2 pr-4">{o.amount}</td>
              <td className="py-2 pr-4">{o.currency}</td>
              <td className="py-2">{new Date(o.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const TABS = [
  { value: 'collections', label: 'Collections', status: 'PAID' },
  { value: 'pending', label: 'Pending', status: 'PENDING' },
  { value: 'failed', label: 'Failed', status: 'FAILED' },
  { value: 'refunds', label: 'Refunds', status: 'REFUNDED' },
] as const

export function PaymentsTabs({ guildId, collections, pending, failed, refunds }: PaymentsTabsProps) {
  const dataMap = {
    collections,
    pending,
    failed,
    refunds,
  } as const

  return (
    <Tabs.Root defaultValue="collections">
      <Tabs.List className="flex gap-1 border-b border-white/10 mb-4">
        {TABS.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className="px-4 py-2 text-sm font-medium text-white/60 rounded-t data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-violet-500 transition-colors"
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {TABS.map((tab) => (
        <Tabs.Content key={tab.value} value={tab.value} className="space-y-3">
          <div className="flex justify-end">
            <a
              href={`/api/servers/${guildId}/orders/export?status=${tab.status}`}
              className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
              download
            >
              Export CSV
            </a>
          </div>
          <OrderTable orders={dataMap[tab.value]} />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
