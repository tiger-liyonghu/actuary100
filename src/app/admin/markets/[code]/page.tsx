import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  success:     { text: '✓ 成功',   cls: 'bg-emerald-900/40 text-emerald-400' },
  failed:      { text: '✗ 失败',   cls: 'bg-red-900/40 text-red-400' },
  js_required: { text: '需JS',     cls: 'bg-amber-900/40 text-amber-400' },
  manual:      { text: '人工',     cls: 'bg-blue-900/40 text-blue-400' },
  pending:     { text: '待抓取',   cls: 'bg-zinc-800 text-zinc-500' },
}

/** 标准化公司名用于模糊匹配 */
function normName(s: string) {
  return s.toLowerCase().replace(/[\s\-_.,()（）。，、]/g, '')
}

export default async function MarketDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params
  const code = rawCode.toUpperCase()

  const [marketRes, insurersRes, profilesRes] = await Promise.all([
    sb.from('markets').select('*').eq('code', code).single(),
    sb.from('licensed_insurers')
      .select('*')
      .eq('market_code', code)
      .order('company_type')
      .order('company_name_local')
      .limit(1000),
    sb.from('company_profiles')
      .select('company_name, status, website_url, source_url, scraped_at')
      .eq('market_code', code)
      .limit(2000),
  ])

  const market   = marketRes.data
  const insurers = insurersRes.data ?? []
  const profiles = profilesRes.data ?? []

  if (!market) {
    return <div className="p-8 text-zinc-500">市场代码 {code} 不存在</div>
  }

  // 建立 公司名 → profile 的模糊查找表
  const profileMap = new Map<string, typeof profiles[0]>()
  for (const p of profiles) {
    profileMap.set(normName(p.company_name), p)
  }

  function findProfile(name: string) {
    const key = normName(name)
    if (profileMap.has(key)) return profileMap.get(key)!
    // 部分匹配：找 key 包含或被包含
    for (const [k, v] of profileMap) {
      if (key.includes(k) || k.includes(key)) return v
    }
    return null
  }

  // 按类型分组
  const byType: Record<string, typeof insurers> = {}
  for (const ins of insurers) {
    const t = ins.company_type ?? 'other'
    if (!byType[t]) byType[t] = []
    byType[t].push(ins)
  }

  const typeLabel: Record<string, string> = {
    life: '寿险', 'non-life': '非寿险 / 财险', composite: '综合险',
    reinsurance: '再保险', takaful: '回教保险', captive: '专属自保', other: '其他',
  }

  // 统计
  const total      = insurers.length
  const hasWeb     = insurers.filter(i => i.website).length
  const profOk     = insurers.filter(i => findProfile(i.company_name_local)?.status === 'success').length
  const profTotal  = insurers.filter(i => findProfile(i.company_name_local)).length

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/markets" className="text-xs text-zinc-600 hover:text-zinc-400">← 市场清单</Link>
        <span className="text-zinc-700">/</span>
        <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-sm text-zinc-400">{code}</span>
        <span className="text-lg font-bold text-white">{market.name_zh}</span>
        <a href={market.regulator_url} target="_blank" rel="noopener noreferrer"
          className="ml-auto text-xs text-blue-400 hover:underline">
          {market.regulator_en} ↗
        </a>
      </div>

      {/* Pipeline stats */}
      <div className="mb-8 grid grid-cols-5 gap-3">
        {[
          { label: '① 持牌险企',   value: total,     sub: `预估 ${market.insurers_count ?? '?'}`,         color: 'text-amber-400' },
          { label: '② 有官网',     value: hasWeb,    sub: `${total > 0 ? Math.round(hasWeb/total*100) : 0}%`,  color: 'text-blue-400' },
          { label: '③ 简介已采',   value: profOk,    sub: `共匹配 ${profTotal} 条`,                       color: 'text-indigo-400' },
          { label: '货币',          value: market.currency ?? '—', sub: '',                               color: 'text-zinc-400' },
          { label: '采集时间',      value: insurers[0]?.scraped_at
            ? new Date(insurers[0].scraped_at).toLocaleDateString('zh-CN')
            : '未采集', sub: insurers[0]?.valid_as_of ?? '',                                               color: 'text-zinc-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-zinc-800 px-4 py-3">
            <div className="text-[10px] text-zinc-600">{s.label}</div>
            <div className={`mt-0.5 text-lg font-semibold ${s.color}`}>{s.value}</div>
            {s.sub && <div className="text-[10px] text-zinc-700">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Company list */}
      {insurers.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-16 text-center text-sm text-zinc-600">
          暂无数据 — 请先运行 05_scrape 工作流
        </div>
      ) : (
        Object.entries(byType).map(([type, list]) => (
          <div key={type} className="mb-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-300">
              {typeLabel[type] ?? type}
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-normal text-zinc-500">
                {list.length} 家
              </span>
            </h3>

            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="px-3 py-2 text-left font-medium text-zinc-500 w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">公司名称</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">牌照号</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">② 官网</th>
                    <th className="px-3 py-2 text-center font-medium text-zinc-500">③ 简介采集</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((ins: any, i: number) => {
                    const profile = findProfile(ins.company_name_local)
                    const website = ins.website || profile?.website_url || null
                    const status  = profile?.status ?? null
                    const badge   = status ? (STATUS_LABEL[status] ?? STATUS_LABEL.pending) : null

                    return (
                      <tr key={ins.id}
                        className={`border-b border-zinc-800/50 ${i % 2 === 0 ? '' : 'bg-zinc-900/20'}`}>
                        <td className="px-3 py-2 text-zinc-700">{i + 1}</td>

                        {/* 公司名称 */}
                        <td className="px-3 py-2">
                          <div className="font-medium text-zinc-200">{ins.company_name_local}</div>
                          {ins.company_name_en && ins.company_name_en !== ins.company_name_local && (
                            <div className="text-[10px] text-zinc-600">{ins.company_name_en}</div>
                          )}
                        </td>

                        {/* 牌照号 */}
                        <td className="px-3 py-2 font-mono text-[10px] text-zinc-600">
                          {ins.license_number ?? '—'}
                        </td>

                        {/* 官网 */}
                        <td className="px-3 py-2">
                          {website ? (
                            <a href={website} target="_blank" rel="noopener noreferrer"
                              className="text-blue-400 hover:underline">
                              {(() => { try { return new URL(website).hostname } catch { return website.slice(0, 30) } })()}
                            </a>
                          ) : (
                            <span className="text-zinc-800">—</span>
                          )}
                        </td>

                        {/* 简介采集状态 */}
                        <td className="px-3 py-2 text-center">
                          {badge ? (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                              {badge.text}
                            </span>
                          ) : (
                            <span className="text-zinc-800">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
