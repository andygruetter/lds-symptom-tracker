import { BottomTabBar } from '@/components/layout/bottom-tab-bar'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div data-theme="patient" className="flex min-h-screen flex-col">
      <main className="flex-1 pb-20">{children}</main>
      <BottomTabBar />
    </div>
  )
}
