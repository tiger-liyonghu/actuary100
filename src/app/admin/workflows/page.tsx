'use client'

import { useState, useEffect, useCallback } from 'react'

interface WorkflowRun {
  id: number
  workflow_id: string
  workflow_name: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  progress_pct: number
  processed: number
  total: number
  ok_count: number
  fail_count: number
  summary: string | null
  error_text: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

const WORKFLOWS = [
  {
    id: '05_insurers',
    name: '持牌险企名单采集',
    desc: '从 HK/AU/SG/MY/TW/IN/PH 监管官网抓取持牌险企清单，写入 licensed_insurers 表',
    envOptions: [
      { key: 'MARKET',  label: '只采集市场',  placeholder: '例: HK / AU / SG，留空=全部' },
      { key: 'DRY_RUN', label: '试跑模式',    placeholder: '1=不写库' },
    ],
  },
  {
    id: '02_scrape',
    name: '公司简介采集',
    desc: '访问险企官网，抓取"关于我们"页面，存入 company_profiles 表',
    envOptions: [
      { key: 'LIMIT',  label: '最多采集（家）', placeholder: '留空=全部, 例: 10' },
      { key: 'MARKET', label: '只采集市场',      placeholder: '例: CN / HK / SG' },
    ],
  },
  {
    id: '03_former',
    name: '前同事关系挖掘',
    desc: '从 career_path 中提取任职重叠记录，写入 relationships（type=former）',
    envOptions: [
      { key: 'DRY_RUN',  label: '试跑模式',      placeholder: '1=不写库' },
      { key: 'MIN_YEAR', label: '最早起始年份',   placeholder: '例: 2000' },
    ],
  },
  {
    id: '04_alumni',
    name: '校友关系挖掘',
    desc: '从 extracted.schools / education 提取同校记录，写入 relationships（type=alumni）',
    envOptions: [
      { key: 'DRY_RUN',   label: '试跑模式',    placeholder: '1=不写库' },
      { key: 'MIN_COUNT', label: '最少校友人数', placeholder: '默认 2' },
    ],
  },
]

function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)  return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  return `${Math.floor(hr / 24)} 天前`
}

function duration(start: string | null, end: string | null) {
  if (!start) return ''
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function WorkflowsPage() {
  const [runs, setRuns]       = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [envValues, setEnvValues] = useState<Record<string, Record<string, string>>>({})
  const [expandedEnv, setExpandedEnv] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    const res = await fetch('/api/admin/run-workflow')
    const json = await res.json()
    setRuns(json.runs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 3000)  // poll every 3s
    return () => clearInterval(interval)
  }, [fetchRuns])

  const triggerRun = async (workflowId: string) => {
    setRunning(p => ({ ...p, [workflowId]: true }))
    try {
      await fetch('/api/admin/run-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, env: envValues[workflowId] ?? {} }),
      })
      await fetchRuns()
    } finally {
      setRunning(p => ({ ...p, [workflowId]: false }))
    }
  }

  // Latest run for each workflow
  const latestRun: Record<string, WorkflowRun> = {}
  for (const r of runs) {
    if (!latestRun[r.workflow_id]) latestRun[r.workflow_id] = r
  }

  return (
    <div className="p-8">
      <h1 className="mb-1 text-xl font-bold text-white">工作流</h1>
      <p className="mb-8 text-xs text-zinc-500">点击运行按钮启动脚本；进度每 3 秒自动刷新</p>

      {/* ── Workflow cards ── */}
      <div className="mb-10 flex flex-col gap-4">
        {WORKFLOWS.map(wf => {
          const latest = latestRun[wf.id]
          const isRunning = latest?.status === 'running' || running[wf.id]
          const envs = envValues[wf.id] ?? {}

          return (
            <div key={wf.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100">{wf.name}</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">{wf.id}</span>
                    {latest && (
                      <StatusBadge status={latest.status} />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{wf.desc}</p>

                  {latest && (
                    <div className="mt-3 space-y-1">
                      {/* Progress bar */}
                      {(isRunning || latest.status === 'completed') && (
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-600">
                            <span>{latest.processed} / {latest.total || '?'}</span>
                            <span>{latest.progress_pct}%</span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className={`h-full rounded-full transition-all ${isRunning ? 'bg-blue-500' : 'bg-emerald-500'}`}
                              style={{ width: `${latest.progress_pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {/* Summary */}
                      {latest.summary && (
                        <div className="text-[11px] text-zinc-400">{latest.summary}</div>
                      )}
                      {/* Error */}
                      {latest.error_text && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[11px] text-red-400">查看错误</summary>
                          <pre className="mt-1 max-h-32 overflow-auto rounded bg-zinc-900 p-2 text-[10px] text-red-300">
                            {latest.error_text}
                          </pre>
                        </details>
                      )}
                      <div className="text-[10px] text-zinc-600">
                        上次运行: {timeAgo(latest.created_at)}
                        {latest.started_at && (
                          <span className="ml-2">耗时: {duration(latest.started_at, latest.completed_at)}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  <button
                    onClick={() => triggerRun(wf.id)}
                    disabled={isRunning}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      isRunning
                        ? 'cursor-not-allowed bg-zinc-800 text-zinc-600'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                  >
                    {isRunning ? '运行中…' : '▷ 运行'}
                  </button>
                  <button
                    onClick={() => setExpandedEnv(expandedEnv === wf.id ? null : wf.id)}
                    className="text-[11px] text-zinc-600 hover:text-zinc-400"
                  >
                    {expandedEnv === wf.id ? '▲ 收起参数' : '▼ 设置参数'}
                  </button>
                </div>
              </div>

              {/* Env params */}
              {expandedEnv === wf.id && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
                  {wf.envOptions.map(opt => (
                    <div key={opt.key}>
                      <label className="mb-1 block text-[10px] text-zinc-500">{opt.label} ({opt.key})</label>
                      <input
                        type="text"
                        placeholder={opt.placeholder}
                        value={envs[opt.key] ?? ''}
                        onChange={e => setEnvValues(p => ({
                          ...p,
                          [wf.id]: { ...(p[wf.id] ?? {}), [opt.key]: e.target.value },
                        }))}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:border-zinc-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Run history ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">运行历史</h2>
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-600">加载中…</div>
        ) : runs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 py-8 text-center text-xs text-zinc-600">暂无运行记录</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  {['ID', '工作流', '状态', '进度', '摘要', '耗时', '时间'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 30).map(r => (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                    <td className="px-4 py-2 font-mono text-zinc-600">#{r.id}</td>
                    <td className="px-4 py-2 text-zinc-300">{r.workflow_name}</td>
                    <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2 text-zinc-400">{r.progress_pct}%</td>
                    <td className="max-w-xs px-4 py-2 truncate text-zinc-500">{r.summary ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-600">{duration(r.started_at, r.completed_at)}</td>
                    <td className="px-4 py-2 text-zinc-600">{timeAgo(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running:   'bg-blue-900/40 text-blue-400',
    completed: 'bg-emerald-900/40 text-emerald-400',
    failed:    'bg-red-900/40 text-red-400',
    idle:      'bg-zinc-800 text-zinc-500',
  }
  const labels: Record<string, string> = {
    running: '运行中', completed: '完成', failed: '失败', idle: '待运行',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status] ?? styles.idle}`}>
      {labels[status] ?? status}
    </span>
  )
}
