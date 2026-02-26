'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Profile {
  id: number
  company_name: string
  market_code: string
  website_url: string | null
  source_url: string | null
  page_title: string | null
  raw_text: string | null
  scraped_at: string | null
  status: string
  error_msg: string | null
}

const STATUS_OPTS = ['all', 'pending', 'success', 'failed', 'js_required', 'manual'] as const
const STATUS_LABELS: Record<string, string> = {
  all: '全部', pending: '待采集', success: '成功', failed: '失败',
  js_required: '需JS', manual: '人工',
}
const STATUS_COLOR: Record<string, string> = {
  success:     'bg-emerald-900/40 text-emerald-400',
  failed:      'bg-red-900/40 text-red-400',
  js_required: 'bg-amber-900/40 text-amber-400',
  pending:     'bg-zinc-800 text-zinc-500',
  manual:      'bg-blue-900/40 text-blue-400',
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const PAGE_SIZE = 30

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    let q = sb.from('company_profiles').select('*', { count: 'exact' })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data, count } = await q
      .order('scraped_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    setProfiles(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [statusFilter, page])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  const approve = async (profile: Profile) => {
    await sb.from('company_profiles').update({ status: 'manual' }).eq('id', profile.id)
    await fetchProfiles()
    setSelected(p => p?.id === profile.id ? { ...p, status: 'manual' } : p)
  }

  const reject = async (profile: Profile) => {
    await sb.from('company_profiles').update({ status: 'failed', error_msg: '人工拒绝' }).eq('id', profile.id)
    await fetchProfiles()
    setSelected(null)
  }

  return (
    <div className="flex h-full">
      {/* ── List panel ── */}
      <div className="flex w-80 flex-shrink-0 flex-col border-r border-zinc-800">
        <div className="border-b border-zinc-800 p-4">
          <h1 className="mb-3 text-sm font-bold text-white">公司简介审核</h1>
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTS.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(0) }}
                className={`rounded-full px-2.5 py-0.5 text-[11px] transition ${
                  statusFilter === s
                    ? 'bg-zinc-600 text-white'
                    : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-zinc-600">共 {total} 条</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-600">加载中…</div>
          ) : profiles.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`w-full border-b border-zinc-800/50 px-4 py-3 text-left transition hover:bg-zinc-900 ${
                selected?.id === p.id ? 'bg-zinc-900' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-zinc-200 leading-snug">{p.company_name}</span>
                <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${STATUS_COLOR[p.status] ?? 'bg-zinc-800 text-zinc-500'}`}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-600">
                <span>{p.market_code}</span>
                {p.scraped_at && <span>{new Date(p.scraped_at).toLocaleDateString('zh-CN')}</span>}
              </div>
              {p.raw_text && (
                <div className="mt-1 text-[10px] leading-relaxed text-zinc-600 line-clamp-2">
                  {p.raw_text.slice(0, 80)}…
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-800 p-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded px-2 py-1 text-xs text-zinc-600 hover:text-zinc-300 disabled:opacity-30"
          >
            ← 上一页
          </button>
          <span className="text-[10px] text-zinc-600">{page + 1} / {Math.ceil(total / PAGE_SIZE) || 1}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= total}
            className="rounded px-2 py-1 text-xs text-zinc-600 hover:text-zinc-300 disabled:opacity-30"
          >
            下一页 →
          </button>
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            选择左侧条目查看详情
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.company_name}</h2>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                  <span>{selected.market_code}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[selected.status] ?? 'bg-zinc-800 text-zinc-500'}`}>
                    {STATUS_LABELS[selected.status] ?? selected.status}
                  </span>
                  {selected.scraped_at && (
                    <span>采集于 {new Date(selected.scraped_at).toLocaleString('zh-CN')}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approve(selected)}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                >
                  ✓ 通过
                </button>
                <button
                  onClick={() => reject(selected)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-red-900/50 hover:text-red-400"
                >
                  ✕ 拒绝
                </button>
              </div>
            </div>

            <div className="mb-4 space-y-2 text-xs">
              {selected.website_url && (
                <div className="flex gap-2">
                  <span className="w-16 flex-shrink-0 text-zinc-600">官网</span>
                  <a href={selected.website_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:underline break-all">{selected.website_url}</a>
                </div>
              )}
              {selected.source_url && (
                <div className="flex gap-2">
                  <span className="w-16 flex-shrink-0 text-zinc-600">来源页</span>
                  <a href={selected.source_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:underline break-all">{selected.source_url}</a>
                </div>
              )}
              {selected.page_title && (
                <div className="flex gap-2">
                  <span className="w-16 flex-shrink-0 text-zinc-600">页面标题</span>
                  <span className="text-zinc-300">{selected.page_title}</span>
                </div>
              )}
              {selected.error_msg && (
                <div className="flex gap-2">
                  <span className="w-16 flex-shrink-0 text-zinc-600">错误信息</span>
                  <span className="text-red-400">{selected.error_msg}</span>
                </div>
              )}
            </div>

            {selected.raw_text && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  正文内容 ({selected.raw_text.length} 字)
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {selected.raw_text}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
