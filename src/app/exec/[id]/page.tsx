import { getExecutive, getEgoGraph } from '@/lib/api'
import { notFound } from 'next/navigation'
import ExecPageClient from '@/components/ExecPageClient'

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

  return <ExecPageClient exec={exec} nodes={nodes} edges={edges} />
}
