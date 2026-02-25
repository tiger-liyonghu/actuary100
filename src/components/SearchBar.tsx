'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { searchExecutives } from '@/lib/api'
import type { Executive } from '@/types'

export default function SearchBar({ placeholder = '搜索高管姓名…' }: { placeholder?: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Executive[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 1) { setResults([]); setOpen(false); return }
    setLoading(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const data = await searchExecutives(query)
        setResults(data)
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const go = (id: number) => {
    setOpen(false)
    setQuery('')
    router.push(`/exec/${id}`)
  }

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 pr-10 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {loading && (
          <div className="absolute right-3 top-3.5 h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-400" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
          {results.map(exec => (
            <li
              key={exec.id}
              onClick={() => go(exec.id)}
              className="flex cursor-pointer flex-col px-4 py-3 hover:bg-zinc-800"
            >
              <span className="text-sm font-medium text-white">{exec.name}</span>
              <span className="mt-0.5 text-xs text-zinc-400">
                {exec.title} · {exec.company}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && results.length === 0 && !loading && query.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-500 shadow-xl">
          未找到相关高管
        </div>
      )}
    </div>
  )
}
