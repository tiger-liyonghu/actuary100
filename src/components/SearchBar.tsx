'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { smartSearch, type SearchResult } from '@/lib/api'

const MATCH_LABEL: Record<SearchResult['matchType'], string> = {
  name:    '姓名',
  company: '公司',
  school:  '学校',
}
const MATCH_COLOR: Record<SearchResult['matchType'], string> = {
  name:    'text-blue-400',
  company: 'text-amber-400',
  school:  'text-emerald-400',
}

interface Props {
  placeholder?: string
  onSelect?: (id: number) => void
}

export default function SearchBar({ placeholder = '搜索姓名 / 公司 / 学校…', onSelect }: Props) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref   = useRef<HTMLDivElement>(null)

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const data = await smartSearch(q)
      setResults(data)
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce while typing
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => runSearch(query), 320)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [query, runSearch])

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const pick = (r: SearchResult) => {
    setOpen(false)
    setQuery('')
    onSelect?.(r.id)
  }

  // Group results by match type for display
  const groups: { type: SearchResult['matchType']; items: SearchResult[] }[] = []
  for (const type of ['name', 'company', 'school'] as const) {
    const items = results.filter(r => r.matchType === type)
    if (items.length) groups.push({ type, items })
  }

  return (
    <div ref={ref} className="relative w-full">
      {/* Input + button */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch(query)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-3 pr-8 text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
          {loading && (
            <div className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-400" />
          )}
        </div>
        <button
          onClick={() => runSearch(query)}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-500 transition hover:border-blue-500 hover:bg-zinc-800 hover:text-blue-400"
          title="搜索"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full max-h-80 overflow-y-auto rounded-xl border border-zinc-700/80 bg-zinc-900 shadow-2xl">
          {groups.length === 0 && !loading && (
            <div className="px-4 py-3 text-xs text-zinc-500">
              无结果 / No results found
            </div>
          )}

          {groups.map(({ type, items }) => (
            <div key={type}>
              {/* Group header */}
              <div className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest ${MATCH_COLOR[type]} bg-zinc-950/60`}>
                <span>{MATCH_LABEL[type]}</span>
                {type === 'school' && <span className="text-zinc-600 normal-case tracking-normal font-normal">· 匹配学校</span>}
                {type === 'company' && <span className="text-zinc-600 normal-case tracking-normal font-normal">· 匹配公司</span>}
              </div>

              {items.map(r => (
                <button
                  key={r.id}
                  onClick={() => pick(r)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800 transition"
                >
                  {/* Avatar */}
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white">
                    {r.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-medium text-white">{r.name}</span>
                      {type === 'school' && (
                        <span className="text-xs text-emerald-400">· {r.matchValue}</span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-zinc-500">
                      {r.title}{r.company ? ` · ${r.company}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}

          {/* Hint */}
          {results.length > 0 && (
            <div className="border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-700">
              支持姓名 / 公司 / 学校 模糊匹配
            </div>
          )}
        </div>
      )}
    </div>
  )
}
