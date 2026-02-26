'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Exec {
  id: number
  name: string
  title: string | null
  company: string | null
  region: string | null
  bio: string | null
  career_path: any[] | null
  education: any[] | null
  qualifications: string[] | null
}

const REGION_LABEL: Record<string, string> = {
  CN: '中国大陆', HK: '中国香港', SG: '新加坡',
}
const REGION_COLOR: Record<string, string> = {
  CN: '#3b82f6', HK: '#8b5cf6', SG: '#10b981',
}

export default function ExecutivesPage() {
  const [execs, setExecs] = useState<Exec[]>([])
  const [selected, setSelected] = useState<Exec | null>(null)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [saving, setSaving] = useState(false)
  const PAGE_SIZE = 40

  const fetchExecs = useCallback(async () => {
    setLoading(true)
    let q = sb.from('executives')
      .select('id, name, title, company, region, bio, career_path, education, qualifications', { count: 'exact' })

    if (search) q = q.or(`name.ilike.%${search}%,company.ilike.%${search}%`)
    if (regionFilter !== 'all') q = q.eq('region', regionFilter)

    const { data, count } = await q
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    setExecs(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [search, regionFilter, page])

  useEffect(() => { fetchExecs() }, [fetchExecs])

  const saveBio = async () => {
    if (!selected) return
    setSaving(true)
    await sb.from('executives').update({ bio: editBio }).eq('id', selected.id)
    setSelected(e => e ? { ...e, bio: editBio } : e)
    setExecs(list => list.map(e => e.id === selected.id ? { ...e, bio: editBio } : e))
    setEditing(false)
    setSaving(false)
  }

  return (
    <div className="flex h-full">
      {/* ── List ── */}
      <div className="flex w-80 flex-shrink-0 flex-col border-r border-zinc-800">
        <div className="border-b border-zinc-800 p-4">
          <h1 className="mb-3 text-sm font-bold text-white">高管数据</h1>
          <input
            type="text"
            placeholder="搜索姓名、公司…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
          <div className="mt-2 flex gap-1.5">
            {['all', 'CN', 'HK', 'SG'].map(r => (
              <button
                key={r}
                onClick={() => { setRegionFilter(r); setPage(0) }}
                className={`rounded-full px-2.5 py-0.5 text-[11px] transition ${
                  regionFilter === r
                    ? 'bg-zinc-600 text-white'
                    : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {r === 'all' ? '全部' : r}
              </button>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-zinc-600">共 {total} 位</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-600">加载中…</div>
          ) : execs.map(e => (
            <button
              key={e.id}
              onClick={() => { setSelected(e); setEditing(false) }}
              className={`w-full border-b border-zinc-800/50 px-4 py-3 text-left transition hover:bg-zinc-900 ${
                selected?.id === e.id ? 'bg-zinc-900' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: REGION_COLOR[e.region ?? 'CN'] }}
                >
                  {e.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate">{e.name}</div>
                  <div className="text-[10px] text-zinc-600 truncate">{e.title}</div>
                </div>
              </div>
              {e.company && (
                <div className="mt-1 text-[10px] text-zinc-600 truncate pl-8">{e.company}</div>
              )}
            </button>
          ))}
        </div>

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

      {/* ── Detail ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            选择左侧高管查看详情
          </div>
        ) : (
          <div>
            <div className="mb-5 flex items-start gap-3">
              <div
                className="h-12 w-12 flex-shrink-0 rounded-full flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: REGION_COLOR[selected.region ?? 'CN'] }}
              >
                {selected.name[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                <p className="text-sm text-zinc-400">{selected.title}</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {selected.company}  ·  {REGION_LABEL[selected.region ?? ''] ?? selected.region}
                  <span className="ml-2 font-mono text-zinc-700">#{selected.id}</span>
                </p>
              </div>
            </div>

            {/* Bio section (editable) */}
            <Section title="简介">
              {editing ? (
                <div>
                  <textarea
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-200 placeholder-zinc-700 focus:border-zinc-500 focus:outline-none resize-none"
                    placeholder="输入简介…"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveBio}
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {saving ? '保存中…' : '保存'}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {selected.bio ?? <span className="italic text-zinc-700">暂无简介</span>}
                  </p>
                  <button
                    onClick={() => { setEditing(true); setEditBio(selected.bio ?? '') }}
                    className="flex-shrink-0 rounded-lg border border-zinc-800 px-2.5 py-1 text-[10px] text-zinc-600 hover:border-zinc-600 hover:text-zinc-300"
                  >
                    编辑
                  </button>
                </div>
              )}
            </Section>

            {/* Education */}
            {selected.education && selected.education.length > 0 && (
              <Section title="教育背景">
                <div className="space-y-2">
                  {selected.education.map((e: any, i: number) => (
                    <div key={i} className="text-xs">
                      {e.school && <div className="font-medium text-zinc-300">{e.school}</div>}
                      <div className="text-zinc-500">
                        {[e.major, e.degree].filter(Boolean).join(' · ')}
                        {e.year ? ` (${e.year})` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Career path */}
            {selected.career_path && selected.career_path.length > 0 && (
              <Section title={`职业经历 (${selected.career_path.length} 段)`}>
                <div className="space-y-3">
                  {selected.career_path.map((c: any, i: number) => (
                    <div key={i} className="relative pl-3.5 text-xs">
                      <div className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <div className="font-medium text-zinc-300">{c.title}</div>
                      <div className="text-zinc-500">{c.company}</div>
                      <div className="text-zinc-700">
                        {c.start_year ?? '?'} – {c.is_current ? '至今' : (c.end_year ?? '?')}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Qualifications */}
            {selected.qualifications && selected.qualifications.length > 0 && (
              <Section title="资质">
                <div className="flex flex-wrap gap-1.5">
                  {selected.qualifications.map((q: string, i: number) => (
                    <span key={i} className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">{q}</span>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-800/60 py-4">
      <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{title}</h3>
      {children}
    </div>
  )
}
