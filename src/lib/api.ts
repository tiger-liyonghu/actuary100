import { supabase } from './supabase'
import type { Executive, Relationship } from '@/types'

export interface SearchResult {
  id: number
  name: string
  title: string | null
  company: string | null
  region: string | null
  matchType: 'name' | 'company' | 'school'
  matchValue: string
}

export async function smartSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (!q) return []

  const select = 'id, name, title, company, region, extracted'

  // Run 3 queries in parallel
  const [nameRes, companyRes, schoolRes] = await Promise.all([
    supabase.from('executives').select(select).ilike('name', `%${q}%`).limit(6),
    supabase.from('executives').select(select).ilike('company', `%${q}%`).limit(6),
    supabase.from('executives').select(select).filter('extracted::text', 'ilike', `%${q}%`).limit(6),
  ])

  const results: SearchResult[] = []
  const seen = new Set<number>()

  const add = (rows: any[], matchType: SearchResult['matchType'], getValue: (r: any) => string) => {
    for (const r of rows ?? []) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      results.push({ id: r.id, name: r.name, title: r.title, company: r.company, region: r.region, matchType, matchValue: getValue(r) })
    }
  }

  add(nameRes.data ?? [],    'name',    r => r.name)
  add(companyRes.data ?? [], 'company', r => r.company ?? '')
  // For school results: only add if schools array actually matches
  for (const r of schoolRes.data ?? []) {
    if (seen.has(r.id)) continue
    const schools: string[] = r.extracted?.schools ?? []
    const matched = schools.find((s: string) => s.toLowerCase().includes(q.toLowerCase()))
    if (matched) {
      seen.add(r.id)
      results.push({ id: r.id, name: r.name, title: r.title, company: r.company, region: r.region, matchType: 'school', matchValue: matched })
    }
  }

  return results
}

// Keep for backward compat
export async function searchExecutives(query: string, limit = 20): Promise<Executive[]> {
  if (!query.trim()) return []
  const { data, error } = await supabase
    .from('executives')
    .select('id, name, title, company, region')
    .or(`name.ilike.%${query}%,company.ilike.%${query}%`)
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

export type CompanyType  = 'all' | 'life' | 'property'
export type TitleType    = 'all' | 'board' | 'management' | 'actuary'
export type RegionType   = 'all' | 'CN' | 'HK' | 'SG'
export type RelationType = 'all' | 'colleague' | 'former' | 'alumni'

export interface GraphFilters {
  companyType:  CompanyType
  titleType:    TitleType
  region:       RegionType
  relationType: RelationType
}

export async function getPreviewGraph(
  nodeLimit = 150,
  filters: GraphFilters = { companyType: 'all', titleType: 'all', region: 'all', relationType: 'all' }
): Promise<{ nodes: Executive[]; edges: Relationship[] }> {
  let q = supabase
    .from('executives')
    .select('id, name, title, company, region')
    .not('company', 'is', null)

  // region
  if (filters.region !== 'all') q = q.eq('region', filters.region)

  // company type  (life / property based on company name keywords)
  if (filters.companyType === 'life') {
    q = q.or('company.ilike.%人寿%,company.ilike.%健康%,company.ilike.%养老%,company.ilike.%Life%,company.ilike.%life%')
  } else if (filters.companyType === 'property') {
    q = q.or('company.ilike.%财产%,company.ilike.%财险%,company.ilike.%再保%,company.ilike.%农业保险%,company.ilike.%Insurance%')
  }

  // title type
  if (filters.titleType === 'board') {
    q = q.or('title.ilike.%董事长%,title.ilike.%董事%,title.ilike.%监事%')
  } else if (filters.titleType === 'management') {
    q = q.or('title.ilike.%总裁%,title.ilike.%总经理%,title.ilike.%副总%,title.ilike.%CEO%,title.ilike.%chief%')
  } else if (filters.titleType === 'actuary') {
    q = q.or('title.ilike.%精算%,title.ilike.%Actuary%,title.ilike.%actuary%')
  }

  const { data: nodes, error: e1 } = await q.limit(nodeLimit)
  if (e1) throw e1
  const execs = (nodes as Executive[]) ?? []
  const ids = execs.map(n => n.id)
  if (ids.length === 0) return { nodes: [], edges: [] }

  const { data: edges, error: e2 } = await supabase
    .from('relationships')
    .select('*')
    .in('source_id', ids)
    .in('target_id', ids)
    .limit(1200)

  if (e2) throw e2
  return { nodes: execs, edges: (edges as Relationship[]) ?? [] }
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
