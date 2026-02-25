'use client'

import { useRef, useState, useCallback } from 'react'
import SearchBar from './SearchBar'
import BackgroundGraph from './BackgroundGraph'
import ProfilePanel from './ProfilePanel'
import type { GraphFilters, CompanyType, TitleType, RegionType } from '@/lib/api'
import type { Executive } from '@/types'

const COMPANY_OPTS: { value: CompanyType; label: string }[] = [
  { value: 'all',      label: '所有公司' },
  { value: 'life',     label: '寿险健康险' },
  { value: 'property', label: '财险' },
]
const TITLE_OPTS: { value: TitleType; label: string }[] = [
  { value: 'all',        label: '所有职位' },
  { value: 'board',      label: '董事会' },
  { value: 'management', label: '管理层' },
  { value: 'actuary',    label: '精算师' },
]
const REGION_OPTS: { value: RegionType; label: string }[] = [
  { value: 'all', label: '所有地区' },
  { value: 'CN',  label: '中国大陆' },
  { value: 'HK',  label: '中国香港' },
  { value: 'SG',  label: '新加坡' },
]

function Section<T extends string>({
  label, opts, value, onChange,
}: {
  label: string
  opts: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        {label}
      </div>
      <ul className="space-y-0.5">
        {opts.map(o => (
          <li key={o.value}>
            <button
              onClick={() => onChange(o.value)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all ${
                value === o.value
                  ? 'bg-zinc-800 font-medium text-white'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
              }`}
            >
              <span
                className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                  value === o.value ? 'bg-blue-400' : 'bg-zinc-700'
                }`}
              />
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function HomeClient() {
  const graphRef = useRef<HTMLDivElement>(null)
  const [filters, setFilters] = useState<GraphFilters>({
    companyType: 'all',
    titleType:   'all',
    region:      'all',
  })
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handleNodeClick = useCallback((exec: Executive) => {
    setSelectedId(exec.id)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* ── Left sidebar ── */}
      <aside className="flex w-52 flex-shrink-0 flex-col border-r border-zinc-800/60 bg-zinc-950 px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">
            Actuary<span className="text-blue-400">100</span>
          </h1>
          <p className="mt-0.5 text-[10px] text-zinc-600">保险行业高管关系图谱</p>
        </div>

        <div className="mb-6">
          <SearchBar placeholder="搜索高管…" onSelect={id => setSelectedId(id)} />
        </div>

        <div className="flex flex-col gap-5">
          <Section
            label="公司类型"
            opts={COMPANY_OPTS}
            value={filters.companyType}
            onChange={v => setFilters(f => ({ ...f, companyType: v }))}
          />
          <Section
            label="职位"
            opts={TITLE_OPTS}
            value={filters.titleType}
            onChange={v => setFilters(f => ({ ...f, titleType: v }))}
          />
          <Section
            label="地区"
            opts={REGION_OPTS}
            value={filters.region}
            onChange={v => setFilters(f => ({ ...f, region: v }))}
          />
        </div>

        <div className="mt-auto border-t border-zinc-800/60 pt-4 text-xs text-zinc-600">
          <div>1,494+ 高管</div>
          <div className="mt-0.5">15,204+ 关系</div>
          <div className="mt-0.5">191 家公司</div>
        </div>
      </aside>

      {/* ── Graph + Profile panel ── */}
      <div ref={graphRef} className="relative flex-1 overflow-hidden">
        <BackgroundGraph
          filters={filters}
          containerRef={graphRef}
          onNodeClick={handleNodeClick}
        />
        <ProfilePanel
          execId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      </div>
    </div>
  )
}
