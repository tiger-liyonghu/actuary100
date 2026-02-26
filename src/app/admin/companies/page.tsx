import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getCompanies() {
  const rows: { company: string; region: string | null }[] = []
  let page = 0
  while (true) {
    const { data } = await sb
      .from('executives')
      .select('company, region')
      .not('company', 'is', null)
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    page++
  }

  const map: Record<string, { count: number; region: string }> = {}
  for (const r of rows) {
    const key = r.company!
    if (!map[key]) map[key] = { count: 0, region: r.region ?? 'CN' }
    map[key].count++
  }

  return Object.entries(map)
    .map(([company, v]) => ({ company, ...v }))
    .sort((a, b) => b.count - a.count)
}

const REGION_LABEL: Record<string, string> = {
  CN: '中国大陆', HK: '中国香港', SG: '新加坡', AU: '澳大利亚',
  MY: '马来西亚', TW: '台湾', IN: '印度', PH: '菲律宾',
}

const REGION_COLOR: Record<string, string> = {
  CN: 'bg-blue-900/40 text-blue-400',
  HK: 'bg-purple-900/40 text-purple-400',
  SG: 'bg-emerald-900/40 text-emerald-400',
}

export default async function CompaniesPage() {
  const companies = await getCompanies()
  const total = companies.length
  const totalExecs = companies.reduce((s, c) => s + c.count, 0)

  const byRegion: Record<string, number> = {}
  for (const c of companies) {
    byRegion[c.region] = (byRegion[c.region] ?? 0) + 1
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">保险公司清单</h1>
          <p className="mt-1 text-xs text-zinc-500">
            共 <span className="text-zinc-300 font-medium">{total}</span> 家公司 ·{' '}
            <span className="text-zinc-300 font-medium">{totalExecs}</span> 位高管
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {Object.entries(byRegion).sort((a,b)=>b[1]-a[1]).map(([region, count]) => (
            <span key={region}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${REGION_COLOR[region] ?? 'bg-zinc-800 text-zinc-400'}`}>
              {REGION_LABEL[region] ?? region} {count}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="px-4 py-3 text-left font-medium text-zinc-500 w-8">#</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">公司名称</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">地区</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500">高管数</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500">占比</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c, i) => (
              <tr key={c.company}
                className={`border-b border-zinc-800/40 transition hover:bg-zinc-900/40 ${i % 2 === 0 ? '' : 'bg-zinc-900/10'}`}>
                <td className="px-4 py-2.5 text-zinc-700">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-zinc-200">{c.company}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${REGION_COLOR[c.region] ?? 'bg-zinc-800 text-zinc-500'}`}>
                    {REGION_LABEL[c.region] ?? c.region}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="font-semibold text-zinc-200">{c.count}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-blue-500/60"
                        style={{ width: `${Math.min(100, c.count / companies[0].count * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-zinc-600 w-8 text-right">
                      {(c.count / totalExecs * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
