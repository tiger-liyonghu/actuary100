'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getExecutive } from '@/lib/api'
import type { Executive } from '@/types'

const REGION_LABEL: Record<string, string> = {
  CN: '中国大陆', HK: '中国香港', SG: '新加坡',
}
const REGION_COLOR: Record<string, string> = {
  CN: '#3b82f6', HK: '#8b5cf6', SG: '#10b981',
}

interface Props {
  execId: number | null
  onClose: () => void
}

export default function ProfilePanel({ execId, onClose }: Props) {
  const [exec, setExec] = useState<Executive | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (execId === null) return
    setLoading(true)
    setExec(null)
    getExecutive(execId).then(data => {
      setExec(data)
      setLoading(false)
    })
  }, [execId])

  /* ── Empty state ── */
  if (execId === null) {
    return (
      <div className="flex h-full w-72 flex-shrink-0 flex-col items-center justify-center border-l border-zinc-800/60 bg-zinc-950 px-6 text-center">
        <div className="mb-3 text-3xl opacity-20">⬡</div>
        <p className="text-xs text-zinc-600">点击图谱节点<br />或搜索高管<br />查看详情</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col border-l border-zinc-800/60 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="text-xs text-zinc-500">高管详情</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-300"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
          </div>
        )}

        {!loading && exec && (
          <>
            {/* Identity block */}
            <div className="px-5 py-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{
                    backgroundColor: REGION_COLOR[exec.region ?? 'CN'],
                    boxShadow: `0 0 16px ${REGION_COLOR[exec.region ?? 'CN']}44`,
                  }}
                >
                  {exec.name[0]}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white">{exec.name}</h2>
                  <p className="mt-0.5 text-xs leading-snug text-zinc-400">{exec.title}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs">
                {exec.company && (
                  <Row label="公司">
                    <Link href={`/company/${encodeURIComponent(exec.company)}`} className="text-blue-400 hover:underline">
                      {exec.company}
                    </Link>
                  </Row>
                )}
                {exec.region && <Row label="地区"><span className="text-zinc-300">{REGION_LABEL[exec.region] ?? exec.region}</span></Row>}
                {exec.person_identity?.birth_year && <Row label="出生年份"><span className="text-zinc-300">{exec.person_identity.birth_year}</span></Row>}
                {exec.person_identity?.gender && <Row label="性别"><span className="text-zinc-300">{exec.person_identity.gender === 'F' ? '女' : '男'}</span></Row>}
              </div>
            </div>

            {exec.bio && (
              <Section title="简介">
                <p className="text-xs leading-relaxed text-zinc-400">{exec.bio}</p>
              </Section>
            )}

            {exec.education && exec.education.length > 0 && (
              <Section title="教育背景">
                {exec.education.map((e, i) => (
                  <div key={i} className="mb-2 text-xs last:mb-0">
                    {e.school && <div className="font-medium text-zinc-300">{e.school}</div>}
                    <div className="text-zinc-500">{[e.major, e.degree].filter(Boolean).join(' · ')}{e.year ? ` (${e.year})` : ''}</div>
                  </div>
                ))}
              </Section>
            )}

            {exec.qualifications && exec.qualifications.length > 0 && (
              <Section title="资质">
                <div className="flex flex-wrap gap-1.5">
                  {exec.qualifications.map((q, i) => (
                    <span key={i} className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">{q}</span>
                  ))}
                </div>
              </Section>
            )}

            {exec.career_path && exec.career_path.length > 0 && (
              <Section title="职业经历">
                <div className="space-y-3">
                  {exec.career_path.map((c, i) => (
                    <div key={i} className="relative pl-3.5 text-xs">
                      <div className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <div className="font-medium text-zinc-300">{c.title}</div>
                      <div className="text-zinc-500">{c.company}</div>
                      {(c.start_year || c.end_year) && (
                        <div className="text-zinc-600">{c.start_year ?? '?'} – {c.is_current ? '至今' : (c.end_year ?? '?')}</div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {exec.industry_roles && exec.industry_roles.length > 0 && (
              <Section title="行业任职">
                <ul className="space-y-1">
                  {exec.industry_roles.map((r, i) => (
                    <li key={i} className="text-xs text-zinc-400">· {r}</li>
                  ))}
                </ul>
              </Section>
            )}

            <div className="h-4" />
          </>
        )}
      </div>

      {/* Footer */}
      {exec && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <Link
            href={`/exec/${exec.id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
          >
            查看完整关系图
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-14 flex-shrink-0 text-zinc-600">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-800/60 px-5 py-4">
      <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{title}</h3>
      {children}
    </div>
  )
}
