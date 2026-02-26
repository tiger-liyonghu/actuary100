import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getData() {
  const [marketRes, insurerRes] = await Promise.all([
    sb.from('markets').select('*').order('insurers_count', { ascending: false }),
    sb.from('licensed_insurers')
      .select('market_code, company_type, license_status')
      .limit(5000),
  ])

  const countByMarket: Record<string, { total: number; life: number; nonLife: number }> = {}
  for (const r of insurerRes.data ?? []) {
    const k = r.market_code
    if (!countByMarket[k]) countByMarket[k] = { total: 0, life: 0, nonLife: 0 }
    if (r.license_status === 'active') {
      countByMarket[k].total++
      if (r.company_type === 'life')     countByMarket[k].life++
      if (r.company_type === 'non-life') countByMarket[k].nonLife++
    }
  }

  return { markets: marketRes.data ?? [], countByMarket }
}

export default async function MarketsPage() {
  const { markets, countByMarket } = await getData()

  const withData    = markets.filter((m: any) => (countByMarket[m.code]?.total ?? 0) > 0)
  const withoutData = markets.filter((m: any) => (countByMarket[m.code]?.total ?? 0) === 0)

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">市场清单</h1>
          <p className="mt-1 text-xs text-zinc-500">
            {withData.length} 个市场已采集 · {withoutData.length} 个市场待采集
          </p>
        </div>
      </div>

      {/* ── 已采集的市场 ── */}
      {withData.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            已采集 ({withData.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">市场</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">监管机构</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">持牌险企</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">寿险</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">非寿险</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">预估总数</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">覆盖率</th>
                </tr>
              </thead>
              <tbody>
                {withData.map((m: any, i: number) => {
                  const counts   = countByMarket[m.code]
                  const scraped  = counts?.total ?? 0
                  const expected = m.insurers_count ?? 0
                  const coverage = expected > 0 ? Math.min(100, Math.round(scraped / expected * 100)) : 0

                  const href = `/admin/markets/${m.code}`
                  const cell = 'block px-4 py-3'

                  return (
                    <tr key={m.code}
                      className={`border-b border-zinc-800/50 transition hover:bg-zinc-800/40 ${i % 2 === 0 ? '' : 'bg-zinc-900/20'}`}>
                      <td className="p-0">
                        <Link href={href} className={`${cell} flex items-center gap-2`}>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">{m.code}</span>
                          <span className="font-medium text-zinc-200">{m.name_zh}</span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-xs text-zinc-500`}>
                          {m.regulator_en}
                        </Link>
                      </td>
                      <td className="p-0 text-right">
                        <Link href={href} className={`${cell} font-semibold text-emerald-400`}>
                          {scraped}
                        </Link>
                      </td>
                      <td className="p-0 text-right">
                        <Link href={href} className={`${cell} text-zinc-400`}>{counts?.life || '—'}</Link>
                      </td>
                      <td className="p-0 text-right">
                        <Link href={href} className={`${cell} text-zinc-400`}>{counts?.nonLife || '—'}</Link>
                      </td>
                      <td className="p-0 text-right">
                        <Link href={href} className={`${cell} text-zinc-600`}>{expected || '—'}</Link>
                      </td>
                      <td className="p-0 text-right">
                        <Link href={href} className={`${cell} flex items-center justify-end gap-2`}>
                          {coverage > 0 ? (
                            <>
                              <div className="h-1 w-12 overflow-hidden rounded-full bg-zinc-800">
                                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${coverage}%` }} />
                              </div>
                              <span className="w-7 text-right text-zinc-500">{coverage}%</span>
                            </>
                          ) : <span className="text-zinc-700">—</span>}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 暂未采集的市场 ── */}
      {withoutData.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
            没找到数据 ({withoutData.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-800/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/50 bg-zinc-900/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-600">市场</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-600">监管机构</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-600">预估险企数</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-600">状态</th>
                </tr>
              </thead>
              <tbody>
                {withoutData.map((m: any, i: number) => (
                  <tr key={m.code}
                    className={`border-b border-zinc-800/30 ${i % 2 === 0 ? '' : 'bg-zinc-900/10'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700">{m.code}</span>
                        <span className="text-zinc-500">{m.name_zh}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a href={m.regulator_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-zinc-700 hover:text-zinc-500">
                        {m.regulator_en}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700">{m.insurers_count || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-zinc-800/50 px-2 py-0.5 text-[10px] text-zinc-600">
                        没找到
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
