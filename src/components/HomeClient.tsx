'use client'

import { useRef, useState, useCallback } from 'react'
import SearchBar from './SearchBar'
import BackgroundGraph from './BackgroundGraph'
import ProfilePanel from './ProfilePanel'
import FeedbackModal from './FeedbackModal'
import { submitFeedback } from '@/lib/feedback'
import type { GraphFilters, CompanyType, TitleType, RegionType, RelationType } from '@/lib/api'
import type { Executive } from '@/types'

type Lang = 'zh' | 'en'

const COMPANY_OPTS: { value: CompanyType; zh: string; en: string }[] = [
  { value: 'all',      zh: '所有公司', en: 'All Companies' },
  { value: 'life',     zh: '寿险',     en: 'Life Insurance' },
  { value: 'property', zh: '财险',     en: 'P&C Insurance' },
]
const TITLE_OPTS: { value: TitleType; zh: string; en: string }[] = [
  { value: 'all',        zh: '所有职位', en: 'All Titles' },
  { value: 'board',      zh: '董事会',   en: 'Board' },
  { value: 'management', zh: '管理层',   en: 'Management' },
  { value: 'actuary',    zh: '精算师',   en: 'Actuary' },
]
const REGION_OPTS: { value: RegionType; zh: string; en: string }[] = [
  { value: 'all', zh: '所有地区', en: 'All Regions' },
  { value: 'CN',  zh: '中国大陆', en: 'Mainland CN' },
  { value: 'HK',  zh: '中国香港', en: 'Hong Kong' },
  { value: 'SG',  zh: '新加坡',   en: 'Singapore' },
]
const RELATION_OPTS: { value: RelationType; zh: string; en: string }[] = [
  { value: 'all',       zh: '所有关系', en: 'All Relations' },
  { value: 'colleague', zh: '同事',     en: 'Colleague' },
  { value: 'former',    zh: '前同事',   en: 'Former' },
  { value: 'alumni',    zh: '校友',     en: 'Alumni' },
]

const SECTION_LABELS = {
  relation: { zh: '关系', en: 'Relation' },
  company:  { zh: '公司', en: 'Company' },
  title:    { zh: '职位', en: 'Title' },
  region:   { zh: '地区', en: 'Region' },
  reset:    { zh: '✕ 重置筛选', en: '✕ Reset Filters' },
  subtitle: { zh: '保险行业高管关系图谱', en: 'Insurance Executive Network' },
  search:   { zh: '姓名 / 公司 / 学校…', en: 'Name / Company / School…' },
  execs:    { zh: '高管', en: 'Executives' },
  relations:{ zh: '关系', en: 'Relations' },
  companies:{ zh: '家公司', en: 'Companies' },
}

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
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        {label}
      </div>
      <ul className="space-y-0.5">
        {opts.map(o => (
          <li key={o.value}>
            <button
              onClick={() => onChange(o.value)}
              className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition-all ${
                value === o.value
                  ? 'bg-zinc-800 font-medium text-white'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
              }`}
            >
              <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${value === o.value ? 'bg-blue-400' : 'bg-zinc-700'}`} />
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
  const [lang, setLang] = useState<Lang>('zh')
  const [showFeedback, setShowFeedback] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<GraphFilters>({
    companyType:  'all',
    titleType:    'all',
    region:       'all',
    relationType: 'all',
  })
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handleNodeClick = useCallback((exec: Executive) => {
    setSelectedId(exec.id)
  }, [])

  const hasAnyFilter = filters.companyType !== 'all' || filters.titleType !== 'all' ||
                       filters.region !== 'all' || filters.relationType !== 'all'
  const resetFilters = () => setFilters({ companyType: 'all', titleType: 'all', region: 'all', relationType: 'all' })

  const t = (key: keyof typeof SECTION_LABELS) => SECTION_LABELS[key][lang]
  const label = (o: { zh: string; en: string }) => lang === 'zh' ? o.zh : o.en

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">

      {/* ── Desktop: Left sidebar ── */}
      <aside className="hidden md:flex w-48 flex-shrink-0 flex-col border-r border-zinc-800/50 bg-zinc-950 px-4 py-5">
        <div className="mb-4 flex items-start justify-between">
          <p className="text-xs text-zinc-400">{t('subtitle')}</p>
          <button
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="flex-shrink-0 rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
          >
            {lang === 'zh' ? 'EN' : '中'}
          </button>
        </div>

        <SearchBar
          placeholder={t('search')}
          onSelect={setSelectedId}
        />

        <div className="mt-5 flex flex-col gap-4">
          <Section
            label={t('relation')}
            opts={RELATION_OPTS.map(o => ({ value: o.value, label: label(o) }))}
            value={filters.relationType}
            onChange={v => setFilters(f => ({ ...f, relationType: v }))}
          />
          <Section
            label={t('company')}
            opts={COMPANY_OPTS.map(o => ({ value: o.value, label: label(o) }))}
            value={filters.companyType}
            onChange={v => setFilters(f => ({ ...f, companyType: v }))}
          />
          <Section
            label={t('title')}
            opts={TITLE_OPTS.map(o => ({ value: o.value, label: label(o) }))}
            value={filters.titleType}
            onChange={v => setFilters(f => ({ ...f, titleType: v }))}
          />
          <Section
            label={t('region')}
            opts={REGION_OPTS.map(o => ({ value: o.value, label: label(o) }))}
            value={filters.region}
            onChange={v => setFilters(f => ({ ...f, region: v }))}
          />
          {hasAnyFilter && (
            <button
              onClick={resetFilters}
              className="mt-1 w-full rounded-lg border border-zinc-800 px-3 py-1.5 text-left text-xs text-zinc-600 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-400"
            >
              {t('reset')}
            </button>
          )}
        </div>

        <div className="mt-auto border-t border-zinc-800/50 pb-4 pt-4 text-xs text-zinc-700">
          <div>1,494+ {t('execs')}</div>
          <div className="mt-0.5">15,204+ {t('relations')}</div>
          <div className="mt-0.5">191 {t('companies')}</div>
          <button
            onClick={() => setShowFeedback(true)}
            className="mt-3 w-full rounded-lg border border-zinc-800 py-1.5 text-xs text-zinc-600 transition hover:border-zinc-700 hover:text-zinc-400"
          >
            提意见
          </button>
        </div>
      </aside>

      {/* ── Mobile: floating top bar ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-14 bg-gradient-to-b from-zinc-950/90 to-transparent md:hidden" />
      <div className="absolute inset-x-0 top-0 z-30 flex items-center gap-2 px-3 py-2 md:hidden">
        <div className="flex-1">
          <SearchBar
            placeholder={t('search')}
            onSelect={id => { setSelectedId(id); }}
          />
        </div>
        {/* Filter button */}
        <button
          onClick={() => setFilterOpen(true)}
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border transition ${
            hasAnyFilter
              ? 'border-blue-500/60 bg-blue-500/15 text-blue-400'
              : 'border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
          }`}
          aria-label="筛选"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2 4h11M4 7.5h7M6 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {showFeedback && (
        <FeedbackModal
          title="提意见"
          placeholder="请输入你的建议或反馈…"
          requireText
          onSubmit={submitFeedback}
          onClose={() => setShowFeedback(false)}
        />
      )}

      {/* ── Center: graph ── */}
      <div ref={graphRef} className="relative flex-1 overflow-hidden">
        <BackgroundGraph
          filters={filters}
          containerRef={graphRef}
          selectedId={selectedId}
          onNodeClick={handleNodeClick}
          onDeselect={() => setSelectedId(null)}
        />
      </div>

      {/* ── Desktop: ProfilePanel as right sidebar ── */}
      {selectedId !== null && (
        <div className="hidden w-96 flex-shrink-0 md:block">
          <ProfilePanel
            execId={selectedId}
            onClose={() => setSelectedId(null)}
            onSelectExec={setSelectedId}
          />
        </div>
      )}

      {/* ── Mobile: ProfilePanel as bottom sheet ── */}
      {selectedId !== null && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSelectedId(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          {/* flex+max-h gives ProfilePanel a bounded height so its inner flex-1 scroll works */}
          <div
            className="absolute bottom-0 left-0 right-0 flex max-h-[75vh] flex-col overflow-hidden rounded-t-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex flex-shrink-0 justify-center bg-zinc-950 pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-zinc-700" />
            </div>
            {/* min-h-0 lets the flex-1 child shrink below content height, enabling scroll */}
            <div className="min-h-0 flex-1">
              <ProfilePanel
                execId={selectedId}
                onClose={() => setSelectedId(null)}
                onSelectExec={setSelectedId}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: Filter bottom sheet ── */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setFilterOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-zinc-950 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-zinc-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">筛选</span>
                <button
                  onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
                  className="rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
                >
                  {lang === 'zh' ? 'EN' : '中'}
                </button>
              </div>
              <button onClick={() => setFilterOpen(false)} className="text-zinc-500 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Filter sections */}
            <div className="grid grid-cols-2 gap-5 px-5 py-4">
              <Section
                label={t('relation')}
                opts={RELATION_OPTS.map(o => ({ value: o.value, label: label(o) }))}
                value={filters.relationType}
                onChange={v => setFilters(f => ({ ...f, relationType: v }))}
              />
              <Section
                label={t('company')}
                opts={COMPANY_OPTS.map(o => ({ value: o.value, label: label(o) }))}
                value={filters.companyType}
                onChange={v => setFilters(f => ({ ...f, companyType: v }))}
              />
              <Section
                label={t('title')}
                opts={TITLE_OPTS.map(o => ({ value: o.value, label: label(o) }))}
                value={filters.titleType}
                onChange={v => setFilters(f => ({ ...f, titleType: v }))}
              />
              <Section
                label={t('region')}
                opts={REGION_OPTS.map(o => ({ value: o.value, label: label(o) }))}
                value={filters.region}
                onChange={v => setFilters(f => ({ ...f, region: v }))}
              />
            </div>

            {/* Bottom actions */}
            <div className="flex gap-3 border-t border-zinc-800 px-5 py-4">
              {hasAnyFilter && (
                <button
                  onClick={() => { resetFilters(); setFilterOpen(false) }}
                  className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-300"
                >
                  重置
                </button>
              )}
              <button
                onClick={() => setFilterOpen(false)}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                确认
              </button>
            </div>

            {/* Stats + feedback */}
            <div className="flex items-center justify-between border-t border-zinc-800/50 px-5 py-3 text-xs text-zinc-700">
              <span>1,494+ 高管 · 15,204+ 关系</span>
              <button
                onClick={() => { setFilterOpen(false); setShowFeedback(true) }}
                className="text-zinc-600 hover:text-zinc-400"
              >
                提意见
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
