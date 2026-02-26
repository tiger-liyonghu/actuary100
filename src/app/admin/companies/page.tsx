import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Company = {
  id: number
  license_code: string
  name: string
  name_en: string | null
  short_name: string | null
  company_type: string | null
  status: string | null
  regulator: string | null
  website: string | null
  exec_count?: number
}

async function getCompanies(): Promise<Company[]> {
  // 1. 官方机构清单（companies 表）
  const { data: companies } = await sb
    .from('companies')
    .select('id,license_code,name,name_en,short_name,company_type,status,regulator,website')
    .eq('region', 'CN')
    .order('id')

  if (!companies) return []

  // 2. 高管人数（executives 表，按公司名汇总）
  const rows: { company: string }[] = []
  let page = 0
  while (true) {
    const { data } = await sb
      .from('executives')
      .select('company')
      .eq('region', 'CN')
      .not('company', 'is', null)
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    page++
  }
  const execMap: Record<string, number> = {}
  for (const r of rows) {
    execMap[r.company] = (execMap[r.company] ?? 0) + 1
  }

  // 3. 匹配：精确或短名称包含
  return companies.map(c => {
    let count = execMap[c.name] ?? 0
    if (!count && c.short_name) {
      const key = Object.keys(execMap).find(k => k.includes(c.short_name!) || c.name.includes(k.slice(0, 5)))
      if (key) count = execMap[key]
    }
    return { ...c, exec_count: count }
  })
}

const TYPE_LABEL: Record<string, string> = {
  life:             '寿险',
  property:         '财险',
  health:           '健康险',
  pension:          '养老险',
  reinsurance:      '再保险',
  group:            '集团',
  asset_management: '资管',
  policy:           '政策性',
  mutual:           '相互',
  other:            '其他',
}

const TYPE_COLOR: Record<string, string> = {
  life:             'bg-blue-900/50 text-blue-300',
  property:         'bg-orange-900/50 text-orange-300',
  health:           'bg-green-900/50 text-green-300',
  pension:          'bg-purple-900/50 text-purple-300',
  reinsurance:      'bg-cyan-900/50 text-cyan-300',
  group:            'bg-yellow-900/50 text-yellow-300',
  asset_management: 'bg-zinc-800 text-zinc-400',
  policy:           'bg-red-900/50 text-red-300',
  mutual:           'bg-teal-900/50 text-teal-300',
  other:            'bg-zinc-800 text-zinc-500',
}

export default async function CompaniesPage() {
  const companies = await getCompanies()
  const total = companies.length
  const withExecs = companies.filter(c => (c.exec_count ?? 0) > 0).length
  const withWebsite = companies.filter(c => c.website).length
  const totalExecs = companies.reduce((s, c) => s + (c.exec_count ?? 0), 0)

  const byType: Record<string, number> = {}
  for (const c of companies) {
    const t = c.company_type ?? 'other'
    byType[t] = (byType[t] ?? 0) + 1
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">保险机构法人清单</h1>
          <p className="mt-1 text-xs text-zinc-500">
            数据来源：国家金融监督管理总局 · 截至 2024-06-30 ·{' '}
            共 <span className="text-zinc-300 font-medium">{total}</span> 家 ·{' '}
            <span className="text-zinc-300 font-medium">{withExecs}</span> 家有高管数据 ·{' '}
            <span className="text-zinc-300 font-medium">{withWebsite}</span> 家有官网 ·{' '}
            <span className="text-zinc-300 font-medium">{totalExecs}</span> 位高管
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {Object.entries(byType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <span key={type}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLOR[type] ?? 'bg-zinc-800 text-zinc-400'}`}>
                {TYPE_LABEL[type] ?? type} {count}
              </span>
            ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-500">
              <th className="px-3 py-3 text-left font-medium w-8">#</th>
              <th className="px-3 py-3 text-left font-medium w-16">编码</th>
              <th className="px-3 py-3 text-left font-medium">机构名称</th>
              <th className="px-3 py-3 text-left font-medium w-16">类型</th>
              <th className="px-3 py-3 text-left font-medium">监管单位</th>
              <th className="px-3 py-3 text-left font-medium">官网</th>
              <th className="px-3 py-3 text-right font-medium w-14">高管数</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c, i) => (
              <tr
                key={c.license_code}
                className={`border-b border-zinc-800/40 transition hover:bg-zinc-900/40 ${i % 2 === 0 ? '' : 'bg-zinc-900/10'}`}
              >
                <td className="px-3 py-2 text-zinc-700">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-zinc-600">{c.license_code}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-zinc-200 leading-tight">
                    {c.short_name
                      ? <><span className="text-zinc-100">{c.short_name}</span><span className="ml-1.5 text-zinc-500">{c.name}</span></>
                      : c.name}
                  </div>
                  {c.name_en && (
                    <div className="mt-0.5 text-[10px] text-zinc-600 truncate max-w-xs">{c.name_en}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${TYPE_COLOR[c.company_type ?? 'other'] ?? 'bg-zinc-800 text-zinc-500'}`}>
                    {TYPE_LABEL[c.company_type ?? 'other'] ?? c.company_type}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-500 text-[10px] whitespace-nowrap">
                  {c.regulator?.replace('金融监管局', '局').replace('金融监管总局', '总局')}
                </td>
                <td className="px-3 py-2">
                  {c.website ? (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 truncate block max-w-[180px]"
                    >
                      {c.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-zinc-700">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {(c.exec_count ?? 0) > 0
                    ? <span className="font-semibold text-zinc-200">{c.exec_count}</span>
                    : <span className="text-zinc-700">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
