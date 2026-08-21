import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

export function Shell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="flex flex-col min-h-svh max-w-2xl mx-auto w-full">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b border-border">
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>
      <main className="flex-1 px-4 py-4 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  )
}
