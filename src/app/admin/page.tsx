import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function fetchAll<T>(
  table: string,
  select: string,
  filters?: (q: any) => any
): Promise<T[]> {
  const rows: T[] = []
  let page = 0
  while (true) {
    let q = sb.from(table).select(select).range(page * 1000, (page + 1) * 1000 - 1)
    if (filters) q = filters(q)
    const { data } = await q
    if (!data || data.length === 0) break
    rows.push(...(data as T[]))
    if (data.length < 1000) break
    page++
  }
  return rows
}

async function getStats() {
  const [markets, relRows, profileRows, insurerRows, execRows] = await Promise.all([
    sb.from('markets').select('*').order('code').then(r => r.data ?? []),
    fetchAll<{ type: string }>('relationships', 'type'),
    fetchAll<{ status: string; market_code: string | null }>('company_profiles', 'status, market_code'),
    fetchAll<{ market_code: string; license_status: string; website: string | null }>(
      'licensed_insurers', 'market_code, license_status, website'
    ),
    fetchAll<{ region: string | null; company: string | null }>(
      'executives', 'region, company',
      q => q.not('company', 'is', null)
    ),
  ])

  // ── 关系分类
  const relByType: Record<string, number> = {}
  for (const r of relRows) {
    relByType[r.type] = (relByType[r.type] ?? 0) + 1
  }

  // ── 公司简介：全局 + 按市场
  const profileByStatus: Record<string, number> = {}
  const profileByMarket: Record<string, { total: number; success: number; failed: number }> = {}
  for (const r of profileRows) {
    profileByStatus[r.status] = (profileByStatus[r.status] ?? 0) + 1
    const mc = r.market_code ?? 'other'
    if (!profileByMarket[mc]) profileByMarket[mc] = { total: 0, success: 0, failed: 0 }
    profileByMarket[mc].total++
    if (r.status === 'success') profileByMarket[mc].success++
    if (r.status === 'failed')  profileByMarket[mc].failed++
  }

  // ── 持牌险企：按市场统计 total + active + has_website
  const licensedByMarket: Record<string, { total: number; active: number; hasWeb: number }> = {}
  for (const r of insurerRows) {
    const mc = r.market_code
    if (!licensedByMarket[mc]) licensedByMarket[mc] = { total: 0, active: 0, hasWeb: 0 }
    licensedByMarket[mc].total++
    if (r.license_status === 'active') licensedByMarket[mc].active++
    if (r.website) licensedByMarket[mc].hasWeb++
  }

  // ── 高管：按市场统计保司数（去重）+ 高管总数
  const companiesByRegion: Record<string, Set<string>> = {}
  const execsByRegion: Record<string, number> = {}
  for (const e of execRows) {
    const r = e.region ?? 'other'
    if (!companiesByRegion[r]) companiesByRegion[r] = new Set()
    if (e.company) companiesByRegion[r].add(e.company)
    execsByRegion[r] = (execsByRegion[r] ?? 0) + 1
  }

  return {
    markets,
    totalExecs:    execRows.length,
    execsByRegion,
    companiesByRegion,
    totalRels:     relRows.length,
    relByType,
    totalProfiles: profileRows.length,
    profileByStatus,
    profileByMarket,
    licensedByMarket,
  }
}

export default async function AdminDashboard() {
  const s = await getStats()

  const totalLicensed  = Object.values(s.licensedByMarket).reduce((n, v) => n + v.active, 0)
  const totalCompanies = Object.values(s.companiesByRegion).reduce((n, set) => n + set.size, 0)

  const SCRAPER_MARKETS = new Set(['HK', 'AU', 'SG', 'MY', 'TW', 'IN', 'PH'])

  return (
    <div className="p-8">
      <h1 className="mb-1 text-xl font-bold text-white">数据总览</h1>
      <p className="mb-8 text-xs text-zinc-500">实时从 Supabase 读取 · 数据管道漏斗</p>

      {/* ── Top stat cards ── */}
      <div className="mb-10 grid grid-cols-4 gap-4">
        <StatCard title="高管总数"   value={s.totalExecs.toLocaleString()}
          sub={Object.entries(s.execsByRegion).sort((a,b)=>b[1]-a[1]).slice(0,3)
            .map(([k,v])=>`${k} ${v}`).join('  ·  ')} color="blue" />
        <StatCard title="持牌险企（已采集）" value={totalLicensed.toLocaleString()}
          sub={Object.entries(s.licensedByMarket).filter(([,v])=>v.active>0)
            .sort((a,b)=>b[1].active-a[1].active).slice(0,3)
            .map(([k,v])=>`${k} ${v.active}`).join('  ·  ')} color="amber" />
        <StatCard title="关系总数"   value={s.totalRels.toLocaleString()}
          sub={[`同事 ${(s.relByType.colleague??0).toLocaleString()}`,
                `前同事 ${(s.relByType.former??0).toLocaleString()}`,
                `校友 ${(s.relByType.alumni??0).toLocaleString()}`].join('  ·  ')} color="purple" />
        <StatCard title="公司简介"   value={s.totalProfiles.toLocaleString()}
          sub={[`成功 ${s.profileByStatus.success??0}`,
                `失败 ${s.profileByStatus.failed??0}`,
                `需JS ${s.profileByStatus.js_required??0}`].join('  ·  ')} color="green" />
      </div>

      {/* ── Pipeline funnel table ── */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">数据管道 — 各市场进度</h2>
          <Link href="/admin/markets" className="text-[11px] text-blue-400 hover:underline">
            查看完整清单 →
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500">市场</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500">监管机构</th>
                {/* Pipeline stages */}
                <th className="px-3 py-2.5 text-center font-medium text-zinc-500">
                  <span className="text-amber-500">①</span> 持牌险企
                </th>
                <th className="px-3 py-2.5 text-center font-medium text-zinc-500">
                  <span className="text-blue-500">②</span> 有官网
                </th>
                <th className="px-3 py-2.5 text-center font-medium text-zinc-500">
                  <span className="text-indigo-400">③</span> 简介已采
                </th>
                <th className="px-3 py-2.5 text-center font-medium text-zinc-500">
                  <span className="text-emerald-500">④</span> 库内高管
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-zinc-500">预估总数</th>
              </tr>
            </thead>
            <tbody>
              {s.markets.map((m: any, i: number) => {
                const lic     = s.licensedByMarket[m.code]
                const prof    = s.profileByMarket[m.code]
                const dbExecs = s.execsByRegion[m.code] ?? 0
                const dbCos   = s.companiesByRegion[m.code]?.size ?? 0

                const licActive  = lic?.active  ?? 0
                const licHasWeb  = lic?.hasWeb  ?? 0
                const profOk     = prof?.success ?? 0
                const estimated  = m.insurers_count ?? 0

                const hasScaper  = SCRAPER_MARKETS.has(m.code)

                return (
                  <tr key={m.code}
                    className={`border-b border-zinc-800/50 ${i % 2 === 0 ? '' : 'bg-zinc-900/20'}`}>

                    {/* 市场 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
                          {m.code}
                        </span>
                        <span className="font-medium text-zinc-200">{m.name_zh}</span>
                      </div>
                    </td>

                    {/* 监管机构 */}
                    <td className="px-4 py-3">
                      <a href={m.regulator_url} target="_blank" rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-blue-400 hover:underline">
                        {m.regulator_en}
                      </a>
                    </td>

                    {/* ① 持牌险企 */}
                    <td className="px-3 py-3 text-center">
                      {licActive > 0
                        ? <Num value={licActive} color="amber" />
                        : <NotYet label={hasScaper ? '待采集' : '暂无爬虫'} />}
                    </td>

                    {/* ② 有官网 */}
                    <td className="px-3 py-3 text-center">
                      {licActive > 0 && licHasWeb > 0
                        ? <FunnelCell num={licHasWeb} denom={licActive} color="blue" />
                        : licActive > 0
                          ? <Num value={0} color="blue" dim />
                          : <span className="text-zinc-800">—</span>}
                    </td>

                    {/* ③ 简介已采 */}
                    <td className="px-3 py-3 text-center">
                      {profOk > 0
                        ? <FunnelCell num={profOk} denom={Math.max(licActive, 1)} color="indigo" />
                        : prof?.total
                          ? <Num value={0} color="indigo" dim />
                          : <span className="text-zinc-800">—</span>}
                    </td>

                    {/* ④ 库内高管 */}
                    <td className="px-3 py-3 text-center">
                      {dbExecs > 0 ? (
                        <div>
                          <div className="font-semibold text-emerald-400">{dbExecs.toLocaleString()}</div>
                          <div className="text-[10px] text-zinc-600">{dbCos} 家保司</div>
                        </div>
                      ) : (
                        <span className="text-zinc-800">—</span>
                      )}
                    </td>

                    {/* 预估总数 */}
                    <td className="px-4 py-3 text-right text-zinc-600">{estimated || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[10px] text-zinc-700">
          ① 监管机构持牌名单（05工作流）·
          ② 险企官网（来自①或手动）·
          ③ 关于我们页面抓取成功（02工作流）·
          ④ executives 表高管数据
        </p>
      </div>

      {/* ── Relationship distribution ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">关系数据分布</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '同事 colleague', value: s.relByType.colleague ?? 0, color: '#6366f1' },
            { label: '前同事 former',  value: s.relByType.former   ?? 0, color: '#8b5cf6' },
            { label: '校友 alumni',    value: s.relByType.alumni   ?? 0, color: '#f59e0b' },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-zinc-800 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-zinc-500">{item.label}</span>
                <span className="text-sm font-semibold text-zinc-200">{item.value.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full"
                  style={{
                    width: s.totalRels > 0 ? `${(item.value / s.totalRels * 100).toFixed(1)}%` : '0%',
                    backgroundColor: item.color,
                  }} />
              </div>
              <div className="mt-1 text-right text-[10px] text-zinc-600">
                {s.totalRels > 0 ? `${(item.value / s.totalRels * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ title, value, sub, color }: {
  title: string; value: string; sub: string
  color: 'blue' | 'purple' | 'green' | 'amber'
}) {
  const colors = {
    blue: 'text-blue-400', purple: 'text-purple-400',
    green: 'text-emerald-400', amber: 'text-amber-400',
  }
  return (
    <div className="rounded-xl border border-zinc-800 p-5">
      <div className="mb-1 text-xs text-zinc-500">{title}</div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="mt-2 text-[10px] leading-relaxed text-zinc-600">{sub}</div>
    </div>
  )
}

/** 带百分比的漏斗数字 */
function FunnelCell({ num, denom, color }: { num: number; denom: number; color: string }) {
  const pct = denom > 0 ? Math.round(num / denom * 100) : 0
  const textColor: Record<string, string> = {
    blue: 'text-blue-400', indigo: 'text-indigo-400',
    amber: 'text-amber-400', emerald: 'text-emerald-400',
  }
  return (
    <div>
      <div className={`font-semibold ${textColor[color] ?? 'text-zinc-300'}`}>{num.toLocaleString()}</div>
      <div className="text-[10px] text-zinc-600">{pct}%</div>
    </div>
  )
}

function Num({ value, color, dim }: { value: number; color: string; dim?: boolean }) {
  const textColor: Record<string, string> = {
    blue: 'text-blue-400', indigo: 'text-indigo-400',
    amber: 'text-amber-400', emerald: 'text-emerald-400',
  }
  return (
    <span className={dim ? 'text-zinc-700' : (textColor[color] ?? 'text-zinc-300')}>
      {value}
    </span>
  )
}

function NotYet({ label }: { label: string }) {
  return <span className="text-[10px] text-zinc-700">{label}</span>
}
