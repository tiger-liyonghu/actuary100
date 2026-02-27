'use client'

import { useState } from 'react'
import Link from 'next/link'
import EgoGraph from '@/components/EgoGraph'
import type { Executive, Relationship } from '@/types'

interface Props {
  exec: Executive
  nodes: Executive[]
  edges: Relationship[]
}

function ExecProfile({ exec }: { exec: Executive }) {
  const identity = exec.person_identity
  const edu = exec.education ?? []
  const career = exec.career_path ?? []
  const qualifications = exec.qualifications ?? []
  const industryRoles = exec.industry_roles ?? []

  return (
    <>
      {/* Basic info */}
      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
            {exec.name[0]}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{exec.name}</h1>
            <p className="mt-0.5 text-xs text-zinc-400">{exec.title}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-xs">
          {exec.company && (
            <div className="flex gap-2">
              <span className="w-14 flex-shrink-0 text-zinc-600">公司</span>
              <Link
                href={`/company/${encodeURIComponent(exec.company)}`}
                className="text-blue-400 hover:underline"
              >
                {exec.company}
              </Link>
            </div>
          )}
          {exec.region && (
            <div className="flex gap-2">
              <span className="w-14 flex-shrink-0 text-zinc-600">地区</span>
              <span className="text-zinc-300">
                {exec.region === 'CN' ? '中国大陆' : exec.region === 'HK' ? '中国香港' : '新加坡'}
              </span>
            </div>
          )}
          {identity?.birth_year && (
            <div className="flex gap-2">
              <span className="w-14 flex-shrink-0 text-zinc-600">出生年份</span>
              <span className="text-zinc-300">{identity.birth_year}</span>
            </div>
          )}
          {identity?.gender && (
            <div className="flex gap-2">
              <span className="w-14 flex-shrink-0 text-zinc-600">性别</span>
              <span className="text-zinc-300">{identity.gender === 'F' ? '女' : '男'}</span>
            </div>
          )}
        </div>
      </div>

      {exec.bio && (
        <div className="border-t border-zinc-800 px-5 py-4">
          <h2 className="mb-2 text-xs font-semibold text-zinc-500">简介</h2>
          <p className="text-xs leading-relaxed text-zinc-400">{exec.bio}</p>
        </div>
      )}

      {edu.length > 0 && (
        <div className="border-t border-zinc-800 px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold text-zinc-500">教育背景</h2>
          <div className="space-y-2">
            {edu.map((e, i) => (
              <div key={i} className="text-xs">
                {e.school && <div className="font-medium text-zinc-300">{e.school}</div>}
                <div className="text-zinc-500">
                  {[e.major, e.degree].filter(Boolean).join(' · ')}
                  {e.year ? ` (${e.year})` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {qualifications.length > 0 && (
        <div className="border-t border-zinc-800 px-5 py-4">
          <h2 className="mb-2 text-xs font-semibold text-zinc-500">资质</h2>
          <div className="flex flex-wrap gap-1.5">
            {qualifications.map((q, i) => (
              <span key={i} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {career.length > 0 && (
        <div className="border-t border-zinc-800 px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold text-zinc-500">职业经历</h2>
          <div className="space-y-3">
            {career.map((c, i) => (
              <div key={i} className="relative pl-3 text-xs">
                <div className="absolute left-0 top-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                <div className="font-medium text-zinc-300">{c.title}</div>
                <div className="text-zinc-500">{c.company}</div>
                {(c.start_year || c.end_year) && (
                  <div className="text-zinc-600">
                    {c.start_year ?? '?'} – {c.is_current ? '至今' : (c.end_year ?? '?')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {industryRoles.length > 0 && (
        <div className="border-t border-zinc-800 px-5 py-4">
          <h2 className="mb-2 text-xs font-semibold text-zinc-500">行业任职</h2>
          <ul className="space-y-1">
            {industryRoles.map((r, i) => (
              <li key={i} className="text-xs text-zinc-400">· {r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-6" />
    </>
  )
}

export default function ExecPageClient({ exec, nodes, edges }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* ── Desktop: Left panel ── */}
      <aside className="hidden md:flex w-80 flex-shrink-0 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <Link href="/" className="text-xs text-zinc-500 hover:text-white">← 返回</Link>
        </div>
        <ExecProfile exec={exec} />
      </aside>

      {/* ── Graph area ── */}
      <div className="relative flex-1">
        <div className="absolute inset-0">
          <EgoGraph center={exec} nodes={nodes} edges={edges} />
        </div>

        {/* Mobile: floating top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-zinc-950/95 to-transparent md:hidden" />
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-4 py-3 md:hidden">
          <Link href="/" className="pointer-events-auto text-sm text-zinc-400 hover:text-white">
            ←
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-white">{exec.name}</span>
            {exec.company && (
              <span className="truncate text-[10px] text-zinc-500">{exec.company}</span>
            )}
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="pointer-events-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            aria-label="查看详情"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Desktop: graph title */}
        <div className="absolute left-4 top-4 hidden text-sm font-medium text-zinc-400 md:block">
          {exec.name} 的关系网络
        </div>
      </div>

      {/* ── Mobile: profile bottom drawer ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

          {/* Drawer */}
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-zinc-900 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-zinc-700" />
            </div>

            {/* Drawer header (sticky) */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-800 bg-zinc-900/95 px-5 py-3 backdrop-blur-sm">
              <div className="min-w-0 pr-3">
                <div className="font-semibold text-white">{exec.name}</div>
                <div className="mt-0.5 text-xs text-zinc-400 line-clamp-2">{exec.title}</div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-shrink-0 rounded-full p-1 text-zinc-500 hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <ExecProfile exec={exec} />
          </div>
        </div>
      )}
    </div>
  )
}
