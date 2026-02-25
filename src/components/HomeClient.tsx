'use client'

import { useState } from 'react'
import Link from 'next/link'
import SearchBar from './SearchBar'
import BackgroundGraph from './BackgroundGraph'
import type { GraphFilters, CompanyType, TitleType, RegionType } from '@/lib/api'

interface Props {
  companies: { company: string; count: number }[]
}

function FilterGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5 backdrop-blur">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-zinc-700 text-white shadow'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const COMPANY_OPTIONS: { value: CompanyType; label: string }[] = [
  { value: 'all',      label: '所有公司' },
  { value: 'life',     label: '寿险健康险' },
  { value: 'property', label: '财险' },
]

const TITLE_OPTIONS: { value: TitleType; label: string }[] = [
  { value: 'all',        label: '所有职位' },
  { value: 'board',      label: '董事会' },
  { value: 'management', label: '管理层' },
  { value: 'actuary',    label: '精算师' },
]

const REGION_OPTIONS: { value: RegionType; label: string }[] = [
  { value: 'all', label: '所有地区' },
  { value: 'CN',  label: '中国大陆' },
  { value: 'HK',  label: '中国香港' },
  { value: 'SG',  label: '新加坡' },
]

export default function HomeClient({ companies }: Props) {
  const [filters, setFilters] = useState<GraphFilters>({
    companyType: 'all',
    titleType:   'all',
    region:      'all',
  })

  return (
    <main className="relative h-screen overflow-hidden bg-zinc-950">
      {/* Background force graph */}
      <BackgroundGraph filters={filters} />

      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/65 via-transparent to-zinc-950/80" />

      {/* Center content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg">
            Actuary<span className="text-blue-400">100</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">中国及亚太保险行业高管关系图谱</p>
        </div>

        <SearchBar placeholder="搜索高管姓名，例如：蔡希良、尹兆君…" />

        {/* Filter groups */}
        <div className="flex flex-wrap justify-center gap-2">
          <FilterGroup
            options={COMPANY_OPTIONS}
            value={filters.companyType}
            onChange={v => setFilters(f => ({ ...f, companyType: v }))}
          />
          <FilterGroup
            options={TITLE_OPTIONS}
            value={filters.titleType}
            onChange={v => setFilters(f => ({ ...f, titleType: v }))}
          />
          <FilterGroup
            options={REGION_OPTIONS}
            value={filters.region}
            onChange={v => setFilters(f => ({ ...f, region: v }))}
          />
        </div>

        {/* Stats */}
        <div className="flex gap-10 text-center">
          {[
            { label: '高管', value: '1,494+' },
            { label: '关系', value: '15,204+' },
            { label: '公司', value: '191' },
            { label: '地区', value: '3' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-xl font-semibold text-blue-400">{s.value}</div>
              <div className="text-xs text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom company tags */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-5">
        <div className="mx-auto max-w-4xl">
          <div className="mb-2 text-xs text-zinc-700">按公司浏览</div>
          <div className="flex flex-wrap gap-1.5">
            {companies.map(({ company, count }) => (
              <Link
                key={company}
                href={`/company/${encodeURIComponent(company)}`}
                className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2.5 py-1 text-xs text-zinc-500 backdrop-blur transition hover:border-blue-600 hover:text-white"
              >
                {company}
                <span className="ml-1 text-zinc-700">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
