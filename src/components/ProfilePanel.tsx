'use client'

import { useEffect, useState } from 'react'
import { getExecutive, getCompanyExecutives } from '@/lib/api'
import { submitKnown, submitReport } from '@/lib/feedback'
import FeedbackModal from './FeedbackModal'
import type { Executive } from '@/types'

const REGION_LABEL: Record<string, string> = {
  CN: '中国大陆', HK: '中国香港', SG: '新加坡',
}
const REGION_COLOR: Record<string, string> = {
  CN: '#3b82f6', HK: '#8b5cf6', SG: '#10b981',
}

interface Props {
  execId: number
  onClose: () => void
  onSelectExec: (id: number) => void
}

type View = { type: 'exec' } | { type: 'company'; name: string }
type Modal = 'error' | 'outdated' | null

export default function ProfilePanel({ execId, onClose, onSelectExec }: Props) {
  const [exec, setExec]               = useState<Executive | null>(null)
  const [execLoading, setExecLoading] = useState(false)
  const [view, setView]               = useState<View>({ type: 'exec' })
  const [companyExecs, setCompanyExecs]       = useState<Executive[]>([])
  const [companyLoading, setCompanyLoading]   = useState(false)
  const [knownState, setKnownState]   = useState<'idle' | 'done'>('idle')
  const [modal, setModal]             = useState<Modal>(null)

  // Fetch exec data whenever execId changes; also reset to exec view
  useEffect(() => {
    setView({ type: 'exec' })
    setExecLoading(true)
    setExec(null)
    setKnownState('idle')
    setModal(null)
    getExecutive(execId).then(data => {
      setExec(data)
      setExecLoading(false)
    })
  }, [execId])

  const handleKnown = async () => {
    if (knownState === 'done') return
    await submitKnown(execId)
    setKnownState('done')
  }

  // Fetch company executives when switching to company view
  useEffect(() => {
    if (view.type !== 'company') return
    setCompanyLoading(true)
    setCompanyExecs([])
    getCompanyExecutives(view.name).then(data => {
      setCompanyExecs(data)
      setCompanyLoading(false)
    })
  }, [view])

  // ── Company view ──────────────────────────────────────────────────────────
  if (view.type === 'company') {
    return (
      <div className="flex h-full w-72 flex-shrink-0 flex-col border-l border-zinc-800/60 bg-zinc-950">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <button
            onClick={() => setView({ type: 'exec' })}
            className="rounded p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-300"
            title="返回"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">{view.name}</span>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-300"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {companyLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
            </div>
          ) : (
            <>
              <div className="px-5 py-4">
                <div className="text-xs text-zinc-500">
                  共 <span className="font-medium text-zinc-300">{companyExecs.length}</span> 位高管
                </div>
              </div>
              <div className="border-t border-zinc-800/60">
                {companyExecs.map(e => (
                  <button
                    key={e.id}
                    onClick={() => onSelectExec(e.id)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-zinc-900"
                  >
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: REGION_COLOR[e.region ?? 'CN'] }}
                    >
                      {e.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-200">{e.name}</div>
                      <div className="truncate text-xs text-zinc-500">{e.title}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="h-4" />
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Exec view ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col border-l border-zinc-800/60 bg-zinc-950">
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

      <div className="flex-1 overflow-y-auto">
        {execLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
          </div>
        )}

        {!execLoading && exec && (
          <>
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
                    <button
                      onClick={() => setView({ type: 'company', name: exec.company! })}
                      className="text-left text-blue-400 transition hover:text-blue-300 hover:underline"
                    >
                      {exec.company}
                    </button>
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
                    <div className="text-zinc-500">
                      {[e.major, e.degree].filter(Boolean).join(' · ')}
                      {e.year ? ` (${e.year})` : ''}
                    </div>
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
                        <div className="text-zinc-600">
                          {c.start_year ?? '?'} – {c.is_current ? '至今' : (c.end_year ?? '?')}
                        </div>
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

      {/* ── 底部操作按钮 ── */}
      {exec && (
        <div className="flex-shrink-0 border-t border-zinc-800/60 px-4 py-3 flex gap-2">
          <button
            onClick={handleKnown}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
              knownState === 'done'
                ? 'bg-emerald-900/40 text-emerald-400 cursor-default'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {knownState === 'done' ? '✓ 已认识' : '我认识'}
          </button>
          <button
            onClick={() => setModal('error')}
            className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
          >
            报错
          </button>
          <button
            onClick={() => setModal('outdated')}
            className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
          >
            信息过时
          </button>
        </div>
      )}

      {modal === 'error' && (
        <FeedbackModal
          title={`报错：${exec?.name ?? ''}`}
          placeholder="请描述错误信息，例如姓名有误、职位不符…"
          requireText
          onSubmit={async (note) => { await submitReport(execId, 'error', note) }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'outdated' && (
        <FeedbackModal
          title={`信息过时：${exec?.name ?? ''}`}
          placeholder="请说明哪些信息已过时（可选）"
          onSubmit={async (note) => { await submitReport(execId, 'outdated', note || undefined) }}
          onClose={() => setModal(null)}
        />
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
