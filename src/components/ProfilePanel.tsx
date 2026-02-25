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
    if (execId === null) { setExec(null); return }
    setLoading(true)
    getExecutive(execId).then(data => {
      setExec(data)
      setLoading(false)
    })
  }, [execId])

  const visible = execId !== null

  return (
    <>
      {/* Backdrop */}
      {visible && (
        <div
          className="absolute inset-0 z-20"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`absolute right-0 top-0 bottom-0 z-30 flex w-80 flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <span className="text-xs text-zinc-500">高管详情</span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-300"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
            </div>
          )}

          {!loading && exec && (
            <>
              {/* Identity */}
              <div className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                    style={{
                      backgroundColor: REGION_COLOR[exec.region ?? 'CN'],
                      boxShadow: `0 0 14px ${REGION_COLOR[exec.region ?? 'CN']}55`,
                    }}
                  >
                    {exec.name[0]}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-white">{exec.name}</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{exec.title}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs">
                  {exec.company && (
                    <Row label="公司">
                      <Link
                        href={`/company/${encodeURIComponent(exec.company)}`}
                        className="text-blue-400 hover:underline"
                      >
                        {exec.company}
                      </Link>
                    </Row>
                  )}
                  {exec.region && (
                    <Row label="地区">
                      <span className="text-zinc-300">{REGION_LABEL[exec.region] ?? exec.region}</span>
                    </Row>
                  )}
                  {exec.person_identity?.birth_year && (
                    <Row label="出生年份">
                      <span className="text-zinc-300">{exec.person_identity.birth_year}</span>
                    </Row>
                  )}
                  {exec.person_identity?.gender && (
                    <Row label="性别">
                      <span className="text-zinc-300">{exec.person_identity.gender === 'F' ? '女' : '男'}</span>
                    </Row>
                  )}
                </div>
              </div>

              {/* Bio */}
              {exec.bio && (
                <Section title="简介">
                  <p className="text-xs leading-relaxed text-zinc-400">{exec.bio}</p>
                </Section>
              )}

              {/* Education */}
              {exec.education && exec.education.length > 0 && (
                <Section title="教育背景">
                  <div className="space-y-2">
                    {exec.education.map((e, i) => (
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

              {/* Qualifications */}
              {exec.qualifications && exec.qualifications.length > 0 && (
                <Section title="资质">
                  <div className="flex flex-wrap gap-1.5">
                    {exec.qualifications.map((q, i) => (
                      <span key={i} className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
                        {q}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Career path */}
              {exec.career_path && exec.career_path.length > 0 && (
                <Section title="职业经历">
                  <div className="space-y-3">
                    {exec.career_path.map((c, i) => (
                      <div key={i} className="relative pl-3.5 text-xs">
                        <div className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
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
                </Section>
              )}

              {/* Industry roles */}
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

        {/* Footer CTA */}
        {exec && (
          <div className="border-t border-zinc-800 px-4 py-3">
            <Link
              href={`/exec/${exec.id}`}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              查看完整关系图 →
            </Link>
          </div>
        )}
      </div>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-14 flex-shrink-0 text-zinc-600">{label}</span>
      <span>{children}</span>
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
