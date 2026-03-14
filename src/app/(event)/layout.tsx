export default function EventLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div data-theme="patient" className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  )
}
