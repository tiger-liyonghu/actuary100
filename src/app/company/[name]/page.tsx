import { getCompanyExecutives, getCompanyInternalEdges } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EgoGraph from '@/components/EgoGraph'
import type { Executive } from '@/types'

interface Props {
  params: Promise<{ name: string }>
}

export default async function CompanyPage({ params }: Props) {
  const { name } = await params
  const companyName = decodeURIComponent(name)

  const executives = await getCompanyExecutives(companyName)
  if (executives.length === 0) notFound()

  const ids = executives.map(e => e.id)
  const edges = await getCompanyInternalEdges(ids)

  // Use first exec as a dummy center for the graph component
  const center: Executive = {
    ...executives[0],
    bio: null,
    extracted: null,
    career_path: null,
    person_identity: null,
    education: null,
    qualifications: null,
    board_roles: null,
    industry_roles: null,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Left panel */}
      <aside className="flex w-72 flex-shrink-0 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <Link href="/" className="text-xs text-zinc-500 hover:text-white">← 返回</Link>
        </div>

        <div className="px-5 py-5">
          <h1 className="text-base font-bold leading-snug text-white">{executives[0].company}</h1>
          <p className="mt-1 text-xs text-zinc-500">{executives.length} 位高管</p>
        </div>

        <div className="border-t border-zinc-800 px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold text-zinc-500">高管列表</h2>
          <ul className="space-y-2">
            {executives.map(exec => (
              <li key={exec.id}>
                <Link
                  href={`/exec/${exec.id}`}
                  className="flex flex-col rounded-lg px-2 py-2 hover:bg-zinc-800"
                >
                  <span className="text-sm font-medium text-white">{exec.name}</span>
                  <span className="text-xs text-zinc-500">{exec.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Graph */}
      <div className="relative flex-1">
        <div className="absolute inset-0">
          <EgoGraph center={center} nodes={executives} edges={edges} />
        </div>
        <div className="absolute left-4 top-4 text-sm font-medium text-zinc-400">
          {executives[0].company} 内部关系图
        </div>
      </div>
    </div>
  )
}
