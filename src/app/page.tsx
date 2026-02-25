import SearchBar from '@/components/SearchBar'
import BackgroundGraph from '@/components/BackgroundGraph'
import Link from 'next/link'
import { getTopCompanies } from '@/lib/api'

export default async function HomePage() {
  const companies = await getTopCompanies(24)

  return (
    <main className="relative h-screen overflow-hidden bg-zinc-950">
      {/* Full-screen background force graph */}
      <BackgroundGraph />

      {/* Dark gradient overlay so text is readable */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-transparent to-zinc-950/80" />

      {/* Center content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
        <h1 className="mb-2 text-5xl font-bold tracking-tight text-white drop-shadow-lg">
          Actuary<span className="text-blue-400">100</span>
        </h1>
        <p className="mb-10 text-sm text-zinc-400 drop-shadow">
          中国及亚太保险行业高管关系图谱
        </p>

        <SearchBar placeholder="搜索高管姓名，例如：蔡希良、尹兆君…" />

        {/* Stats */}
        <div className="mt-8 flex gap-10 text-center">
          {[
            { label: '高管', value: '1,494+' },
            { label: '关系', value: '15,204+' },
            { label: '公司', value: '191' },
            { label: '地区', value: '3' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-2xl font-semibold text-blue-400 drop-shadow">{s.value}</div>
              <div className="text-xs text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom company tags */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 text-xs text-zinc-600">按公司浏览</div>
          <div className="flex flex-wrap gap-1.5">
            {companies.map(({ company, count }) => (
              <Link
                key={company}
                href={`/company/${encodeURIComponent(company)}`}
                className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2.5 py-1 text-xs text-zinc-400 backdrop-blur transition hover:border-blue-600 hover:text-white"
              >
                {company}
                <span className="ml-1 text-zinc-700">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
