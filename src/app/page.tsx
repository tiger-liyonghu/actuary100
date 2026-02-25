import SearchBar from '@/components/SearchBar'
import { getTopCompanies } from '@/lib/api'
import Link from 'next/link'

export default async function HomePage() {
  const companies = await getTopCompanies(20)

  return (
    <main className="flex min-h-screen flex-col items-center justify-start px-4 pt-24 pb-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Actuary<span className="text-blue-400">100</span>
        </h1>
        <p className="mt-3 text-zinc-400">中国及亚太保险行业高管关系图谱</p>
      </div>

      {/* Search */}
      <SearchBar placeholder="搜索高管姓名，例如：蔡希良、李祝用…" />

      {/* Stats */}
      <div className="mt-8 flex gap-8 text-center">
        {[
          { label: '高管', value: '1,494+' },
          { label: '关系', value: '15,204+' },
          { label: '公司', value: '191' },
          { label: '地区', value: '3' },
        ].map(s => (
          <div key={s.label}>
            <div className="text-2xl font-semibold text-blue-400">{s.value}</div>
            <div className="text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top companies */}
      <div className="mt-16 w-full max-w-2xl">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">按公司浏览</h2>
        <div className="flex flex-wrap gap-2">
          {companies.map(({ company, count }) => (
            <Link
              key={company}
              href={`/company/${encodeURIComponent(company)}`}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-blue-500 hover:text-white"
            >
              {company}
              <span className="ml-1.5 text-zinc-600">{count}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
