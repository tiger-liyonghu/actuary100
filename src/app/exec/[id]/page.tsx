import { getExecutive, getEgoGraph } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EgoGraph from '@/components/EgoGraph'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ExecPage({ params }: Props) {
  const { id } = await params
  const execId = parseInt(id)
  if (isNaN(execId)) notFound()

  const [exec, { nodes, edges }] = await Promise.all([
    getExecutive(execId),
    getEgoGraph(execId, 1),
  ])

  if (!exec) notFound()

  const identity = exec.person_identity
  const edu = exec.education ?? []
  const career = exec.career_path ?? []
  const qualifications = exec.qualifications ?? []
  const industryRoles = exec.industry_roles ?? []

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Left panel */}
      <aside className="flex w-80 flex-shrink-0 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-900">
        {/* Nav */}
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <Link href="/" className="text-xs text-zinc-500 hover:text-white">← 返回</Link>
        </div>

        {/* Basic info */}
        <div className="px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
              {exec.name[0]}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{exec.name}</h1>
              <p className="mt-0.5 text-xs text-zinc-400">{exec.title}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            {exec.company && (
              <div className="flex gap-2">
                <span className="w-14 flex-shrink-0 text-zinc-600">公司</span>
                <Link
                  href={`/company/${encodeURIComponent(exec.company)}`}
                  className="text-blue-400 hover:underline"
                >
                  {exec.company}
                </Link>
              </div>
            )}
            {exec.region && (
              <div className="flex gap-2">
                <span className="w-14 flex-shrink-0 text-zinc-600">地区</span>
                <span className="text-zinc-300">
                  {exec.region === 'CN' ? '中国大陆' : exec.region === 'HK' ? '中国香港' : '新加坡'}
                </span>
              </div>
            )}
            {identity?.birth_year && (
              <div className="flex gap-2">
                <span className="w-14 flex-shrink-0 text-zinc-600">出生年份</span>
                <span className="text-zinc-300">{identity.birth_year}</span>
              </div>
            )}
            {identity?.gender && (
              <div className="flex gap-2">
                <span className="w-14 flex-shrink-0 text-zinc-600">性别</span>
                <span className="text-zinc-300">{identity.gender === 'F' ? '女' : '男'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {exec.bio && (
          <div className="border-t border-zinc-800 px-5 py-4">
            <h2 className="mb-2 text-xs font-semibold text-zinc-500">简介</h2>
            <p className="text-xs leading-relaxed text-zinc-400">{exec.bio}</p>
          </div>
        )}

        {/* Education */}
        {edu.length > 0 && (
          <div className="border-t border-zinc-800 px-5 py-4">
            <h2 className="mb-3 text-xs font-semibold text-zinc-500">教育背景</h2>
            <div className="space-y-2">
              {edu.map((e, i) => (
                <div key={i} className="text-xs">
                  {e.school && <div className="font-medium text-zinc-300">{e.school}</div>}
                  <div className="text-zinc-500">
                    {[e.major, e.degree].filter(Boolean).join(' · ')}
                    {e.year ? ` (${e.year})` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Qualifications */}
        {qualifications.length > 0 && (
          <div className="border-t border-zinc-800 px-5 py-4">
            <h2 className="mb-2 text-xs font-semibold text-zinc-500">资质</h2>
            <div className="flex flex-wrap gap-1.5">
              {qualifications.map((q, i) => (
                <span key={i} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  {q}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Career */}
        {career.length > 0 && (
          <div className="border-t border-zinc-800 px-5 py-4">
            <h2 className="mb-3 text-xs font-semibold text-zinc-500">职业经历</h2>
            <div className="space-y-3">
              {career.map((c, i) => (
                <div key={i} className="relative pl-3 text-xs">
                  <div className="absolute left-0 top-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
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
          </div>
        )}

        {/* Industry roles */}
        {industryRoles.length > 0 && (
          <div className="border-t border-zinc-800 px-5 py-4">
            <h2 className="mb-2 text-xs font-semibold text-zinc-500">行业任职</h2>
            <ul className="space-y-1">
              {industryRoles.map((r, i) => (
                <li key={i} className="text-xs text-zinc-400">· {r}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* Graph area */}
      <div className="relative flex-1">
        <div className="absolute inset-0">
          <EgoGraph center={exec} nodes={nodes} edges={edges} />
        </div>
        <div className="absolute left-4 top-4 text-sm font-medium text-zinc-400">
          {exec.name} 的关系网络
        </div>
      </div>
    </div>
  )
}
