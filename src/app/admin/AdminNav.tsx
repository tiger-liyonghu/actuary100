'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin',            label: '数据总览',  icon: '▦', exact: true },
  { href: '/admin/workflows',  label: '工作流',    icon: '⚙' },
  { href: '/admin/markets',    label: '市场清单',  icon: '◈' },
  { href: '/admin/companies',  label: '公司清单',  icon: '◈' },
  { href: '/admin/executives', label: '高管数据',  icon: '◉' },
  { href: '/admin/profiles',   label: '公司简介',  icon: '◻' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(item => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
              active
                ? 'bg-zinc-800 font-medium text-white'
                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <span className={`w-4 text-center text-xs ${active ? 'text-blue-400' : 'text-zinc-700'}`}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
