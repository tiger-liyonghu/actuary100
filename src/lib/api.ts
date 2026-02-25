import { supabase } from './supabase'
import type { Executive, Relationship } from '@/types'

export async function searchExecutives(query: string, limit = 20): Promise<Executive[]> {
  if (!query.trim()) return []
  const { data, error } = await supabase
    .from('executives')
    .select('id, name, title, company, region')
    .ilike('name', `%${query}%`)
    .limit(limit)
  if (error) throw error
  return (data as Executive[]) ?? []
}

export async function getExecutive(id: number): Promise<Executive | null> {
  const { data, error } = await supabase
    .from('executives')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Executive
}

export async function getEgoGraph(
  centerId: number,
  hops = 1
): Promise<{ nodes: Executive[]; edges: Relationship[] }> {
  // 拉取直接关系
  const { data: edges1, error: e1 } = await supabase
    .from('relationships')
    .select('*')
    .or(`source_id.eq.${centerId},target_id.eq.${centerId}`)
    .limit(200)

  if (e1) throw e1
  const edges = (edges1 ?? []) as Relationship[]

  // 收集所有相关 id
  const neighborIds = new Set<number>()
  neighborIds.add(centerId)
  for (const e of edges) {
    neighborIds.add(e.source_id)
    neighborIds.add(e.target_id)
  }

  // 如果需要 2 跳
  if (hops === 2 && neighborIds.size < 150) {
    const hop1Ids = Array.from(neighborIds).filter(id => id !== centerId)
    const { data: edges2 } = await supabase
      .from('relationships')
      .select('*')
      .or(hop1Ids.map(id => `source_id.eq.${id},target_id.eq.${id}`).join(','))
      .limit(500)

    for (const e of (edges2 ?? []) as Relationship[]) {
      neighborIds.add(e.source_id)
      neighborIds.add(e.target_id)
      if (!edges.find(x => x.id === e.id)) edges.push(e)
    }
  }

  // 拉取所有节点信息
  const ids = Array.from(neighborIds)
  const { data: nodes, error: e2 } = await supabase
    .from('executives')
    .select('id, name, title, company, region')
    .in('id', ids)

  if (e2) throw e2

  return { nodes: (nodes as Executive[]) ?? [], edges }
}

export async function getCompanyExecutives(companyName: string): Promise<Executive[]> {
  const { data, error } = await supabase
    .from('executives')
    .select('id, name, title, company, region')
    .ilike('company', `%${companyName}%`)
    .limit(100)
  if (error) throw error
  return (data as Executive[]) ?? []
}

export async function getCompanyInternalEdges(executiveIds: number[]): Promise<Relationship[]> {
  if (executiveIds.length < 2) return []
  const { data, error } = await supabase
    .from('relationships')
    .select('*')
    .in('source_id', executiveIds)
    .in('target_id', executiveIds)
  if (error) throw error
  return (data as Relationship[]) ?? []
}

export async function getTopCompanies(limit = 30): Promise<{ company: string; count: number }[]> {
  const { data, error } = await supabase
    .from('executives')
    .select('company')
    .not('company', 'is', null)

  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.company) counts[row.company] = (counts[row.company] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
