import Link from 'next/link'
import type { Metadata } from 'next'
import AdminNav from './AdminNav'

export const metadata: Metadata = { title: 'Actuary100 Admin' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* ── Sidebar ── */}
      <aside className="flex w-44 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 px-3 py-5">
        <div className="mb-6 px-2">
          <div className="text-sm font-bold text-white">
            Actuary<span className="text-blue-400">100</span>
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-600">管理后台</div>
        </div>

        <AdminNav />

        <div className="mt-auto border-t border-zinc-800 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-600 transition hover:text-zinc-400"
          >
            ← 返回图谱
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
