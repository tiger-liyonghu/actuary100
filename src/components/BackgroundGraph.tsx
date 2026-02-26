'use client'

import { useEffect, useRef, useState } from 'react'
import type { Executive, Relationship } from '@/types'
import { getPreviewGraph, getEgoGraph, type GraphFilters } from '@/lib/api'

interface SimNode {
  exec: Executive
  x: number; y: number
  vx: number; vy: number
  fx?: number; fy?: number   // fixed position (center node in ego mode)
}

const REGION_COLOR: Record<string, string> = {
  CN: '#3b82f6',
  HK: '#8b5cf6',
  SG: '#10b981',
}
const EDGE_COLOR: Record<string, string> = {
  colleague: 'rgba(99,102,241,0.25)',
  alumni:    'rgba(245,158,11,0.20)',
  former:    'rgba(139,92,246,0.20)',
}
const EGO_EDGE_COLOR: Record<string, string> = {
  colleague: 'rgba(99,102,241,0.85)',
  alumni:    'rgba(245,158,11,0.85)',
  former:    'rgba(167,139,250,0.85)',
}

const LIFE_KW     = ['人寿', '健康', '养老', 'Life', 'life']
const PROPERTY_KW = ['财产', '财险', '再保', '农业保险', 'Insurance', 'insurance']
const BOARD_KW    = ['董事', '监事']
const MGMT_KW     = ['总裁', '总经理', '副总', 'CEO', 'Chief', 'chief', 'President']
const ACTUARY_KW  = ['精算', 'Actuary', 'actuary']

function matchesFilters(exec: Executive, filters: GraphFilters): boolean {
  const company = exec.company ?? ''
  const title   = exec.title   ?? ''
  const region  = exec.region  ?? ''
  if (filters.companyType === 'life'     && !LIFE_KW.some(k => company.includes(k)))     return false
  if (filters.companyType === 'property' && !PROPERTY_KW.some(k => company.includes(k))) return false
  if (filters.titleType   === 'board'      && !BOARD_KW.some(k => title.includes(k)))    return false
  if (filters.titleType   === 'management' && !MGMT_KW.some(k => title.includes(k)))     return false
  if (filters.titleType   === 'actuary'    && !ACTUARY_KW.some(k => title.includes(k)))  return false
  if (filters.region !== 'all' && region !== filters.region)                              return false
  return true
}

function hasActiveFilter(f: GraphFilters) {
  return f.companyType !== 'all' || f.titleType !== 'all' || f.region !== 'all' || f.relationType !== 'all'
}

function loadingLabel(f: GraphFilters): string {
  const parts: string[] = []
  if (f.companyType  !== 'all') parts.push(f.companyType === 'life' ? '寿险' : '财险')
  if (f.titleType    !== 'all') parts.push({ board: '董事会', management: '管理层', actuary: '精算师' }[f.titleType] ?? '')
  if (f.region       !== 'all') parts.push({ CN: '中国大陆', HK: '中国香港', SG: '新加坡' }[f.region] ?? '')
  if (f.relationType !== 'all') parts.push({ colleague: '同事', former: '前同事', alumni: '校友' }[f.relationType] ?? '')
  return parts.length > 0 ? `正在加载 ${parts.join(' · ')}…` : '加载关系图谱…'
}

interface Props {
  filters: GraphFilters
  containerRef: React.RefObject<HTMLDivElement | null>
  selectedId: number | null
  onNodeClick: (exec: Executive) => void
  onDeselect: () => void
}

export default function BackgroundGraph({ filters, containerRef, selectedId, onNodeClick, onDeselect }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const animRef     = useRef<number>(0)
  const stateRef    = useRef<{
    simNodes:    SimNode[]
    nodeById:    Map<number, SimNode>
    edges:       Relationship[]
    hoverId:     number | null
    frame:       number
    egoCenterId: number | null   // non-null while showing ego graph
  }>({ simNodes: [], nodeById: new Map(), edges: [], hoverId: null, frame: 0, egoCenterId: null })

  // Cache of the last-loaded preview graph so we can restore it after ego mode
  const previewCacheRef = useRef<{
    simNodes: SimNode[]
    nodeById: Map<number, SimNode>
    edges:    Relationship[]
  } | null>(null)

  const [previewLoading, setPreviewLoading] = useState(true)
  const [egoLoading,     setEgoLoading]     = useState(false)
  const [hovered, setHovered]               = useState<Executive | null>(null)

  const fetchVersionRef    = useRef(0)
  const egoVersionRef      = useRef(0)
  const filtersRef         = useRef(filters)
  const selectedIdRef      = useRef(selectedId)
  const onNodeClickRef     = useRef(onNodeClick)
  const onDeselectRef      = useRef(onDeselect)

  useEffect(() => { filtersRef.current    = filters    }, [filters])
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => { onNodeClickRef.current = onNodeClick }, [onNodeClick])
  useEffect(() => { onDeselectRef.current  = onDeselect  }, [onDeselect])

  // ── Preview graph: re-fetch when filters change ──────────────────────────
  useEffect(() => {
    const isFiltered = hasActiveFilter(filters)
    const limit = isFiltered ? 800 : 200
    setPreviewLoading(true)
    fetchVersionRef.current++
    const myVersion = fetchVersionRef.current

    getPreviewGraph(limit, filters).then(({ nodes, edges }) => {
      if (fetchVersionRef.current !== myVersion) return

      const container = containerRef.current
      const W = container?.clientWidth  ?? window.innerWidth
      const H = container?.clientHeight ?? window.innerHeight

      const oldById = previewCacheRef.current?.nodeById ?? new Map<number, SimNode>()
      const simNodes: SimNode[] = nodes.map(exec => {
        const old = oldById.get(exec.id)
        if (old) return { ...old, exec, fx: undefined, fy: undefined }
        return {
          exec,
          x: 60 + Math.random() * (W - 120),
          y: 60 + Math.random() * (H - 120),
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
        }
      })
      const nodeById = new Map(simNodes.map(n => [n.exec.id, n]))

      previewCacheRef.current = { simNodes, nodeById, edges }

      // Only update the active graph if we're not in ego mode
      if (selectedIdRef.current === null) {
        stateRef.current = { simNodes, nodeById, edges, hoverId: null, frame: 0, egoCenterId: null }
      }
      setPreviewLoading(false)
    })
  }, [filters])

  // ── Ego graph: fetch when selectedId changes ──────────────────────────────
  useEffect(() => {
    if (selectedId === null) {
      // Restore preview
      if (previewCacheRef.current) {
        const { simNodes, nodeById, edges } = previewCacheRef.current
        stateRef.current = { simNodes, nodeById, edges, hoverId: null, frame: 0, egoCenterId: null }
      }
      return
    }

    setEgoLoading(true)
    egoVersionRef.current++
    const myVersion = egoVersionRef.current

    getEgoGraph(selectedId, 1).then(({ nodes, edges }) => {
      if (egoVersionRef.current !== myVersion) return

      const container = containerRef.current
      const W = container?.clientWidth  ?? window.innerWidth
      const H = container?.clientHeight ?? window.innerHeight
      const cx = W / 2, cy = H / 2

      // Place center node at canvas center (fixed), neighbors scattered around
      const simNodes: SimNode[] = nodes.map(exec => {
        if (exec.id === selectedId) {
          return { exec, x: cx, y: cy, vx: 0, vy: 0, fx: cx, fy: cy }
        }
        const angle = Math.random() * Math.PI * 2
        const r     = 110 + Math.random() * 130
        return {
          exec,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
        }
      })

      stateRef.current = {
        simNodes,
        nodeById: new Map(simNodes.map(n => [n.exec.id, n])),
        edges,
        hoverId: null,
        frame:   0,
        egoCenterId: selectedId,
      }
      setEgoLoading(false)
    })
  }, [selectedId])

  // ── Canvas + physics/draw loop (runs once) ───────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const container = containerRef.current
      const W = container?.clientWidth  ?? window.innerWidth
      const H = container?.clientHeight ?? window.innerHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width  = W * dpr
      canvas.height = H * dpr
      canvas.style.width  = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const REPULSION  = 2200
    const SPRING_K   = 0.006
    const SPRING_LEN = 150
    const GRAVITY    = 0.0009
    const DAMPING    = 0.88

    const tick = () => {
      const { simNodes, nodeById, edges, egoCenterId } = stateRef.current
      const container = containerRef.current
      const W = container?.clientWidth  ?? window.innerWidth
      const H = container?.clientHeight ?? window.innerHeight
      const cx = W / 2, cy = H / 2

      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i], b = simNodes[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const d2 = dx * dx + dy * dy
          if (d2 > 80000) continue
          const d = Math.sqrt(d2) || 0.01
          const f = REPULSION / (d * d)
          if (!a.fx) { a.vx -= (dx / d) * f; a.vy -= (dy / d) * f }
          if (!b.fx) { b.vx += (dx / d) * f; b.vy += (dy / d) * f }
        }
      }
      for (const e of edges) {
        const a = nodeById.get(e.source_id), b = nodeById.get(e.target_id)
        if (!a || !b) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01
        const f = SPRING_K * (d - SPRING_LEN)
        if (!a.fx) { a.vx += (dx / d) * f; a.vy += (dy / d) * f }
        if (!b.fx) { b.vx -= (dx / d) * f; b.vy -= (dy / d) * f }
      }
      for (const n of simNodes) {
        if (n.fx !== undefined) { n.x = n.fx; n.vx = 0; continue }
        n.vx += (cx - n.x) * (egoCenterId ? 0.004 : GRAVITY)
        n.vy += (cy - n.y) * (egoCenterId ? 0.004 : GRAVITY)
        n.vx *= DAMPING; n.vy *= DAMPING
        n.vx = Math.max(-8, Math.min(8, n.vx))
        n.vy = Math.max(-8, Math.min(8, n.vy))
        n.x += n.vx
        n.y += n.vy
      }
    }

    const drawNode = (
      sn: SimNode, r: number, alpha: number,
      glowColor: string | null, glowBlur: number,
      showLabel: boolean, labelBold: boolean
    ) => {
      const color = REGION_COLOR[sn.exec.region ?? 'CN'] ?? '#3b82f6'
      ctx.globalAlpha = alpha
      ctx.shadowColor = glowColor ?? color
      ctx.shadowBlur  = glowBlur
      const grad = ctx.createRadialGradient(sn.x - 1, sn.y - 1, 0, sn.x, sn.y, r)
      grad.addColorStop(0, 'rgba(255,255,255,0.55)')
      grad.addColorStop(1, color)
      ctx.beginPath(); ctx.arc(sn.x, sn.y, r, 0, Math.PI * 2)
      ctx.fillStyle = grad; ctx.fill()
      ctx.shadowBlur = 0; ctx.globalAlpha = 1

      if (showLabel && sn.exec.name) {
        ctx.font = labelBold ? 'bold 12px sans-serif' : '9px sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(sn.exec.name, sn.x + 1, sn.y - r)
        ctx.fillStyle = labelBold ? '#ffffff' : '#cbd5e1'
        ctx.fillText(sn.exec.name, sn.x, sn.y - r - 1)
      }
    }

    const draw = () => {
      const { simNodes, nodeById, edges, hoverId, egoCenterId } = stateRef.current
      const f      = filtersRef.current
      const active = hasActiveFilter(f)
      const container = containerRef.current
      const W = container?.clientWidth  ?? window.innerWidth
      const H = container?.clientHeight ?? window.innerHeight
      ctx.clearRect(0, 0, W, H)

      // ── EGO MODE ─────────────────────────────────────────────────────────
      if (egoCenterId !== null) {
        // Draw all edges colored by relationship type
        for (const e of edges) {
          const a = nodeById.get(e.source_id), b = nodeById.get(e.target_id)
          if (!a || !b) continue
          const isHov = hoverId === e.source_id || hoverId === e.target_id
          if (isHov) {
            ctx.strokeStyle = EGO_EDGE_COLOR[e.type] ?? 'rgba(148,163,184,0.9)'
            ctx.lineWidth = 2
            ctx.shadowColor = EGO_EDGE_COLOR[e.type] ?? '#94a3b8'; ctx.shadowBlur = 8
          } else {
            ctx.strokeStyle = EGO_EDGE_COLOR[e.type] ?? 'rgba(99,102,241,0.6)'
            ctx.lineWidth = 1.2; ctx.shadowBlur = 0
          }
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
        ctx.shadowBlur = 0

        // Draw neighbor nodes
        for (const sn of simNodes) {
          if (sn.exec.id === egoCenterId) continue
          const isHov  = hoverId === sn.exec.id
          const color  = REGION_COLOR[sn.exec.region ?? 'CN'] ?? '#3b82f6'
          drawNode(sn, isHov ? 11 : 8, isHov ? 1 : 0.85, color, isHov ? 16 : 6, true, isHov)
        }

        // Draw center node on top
        const center = nodeById.get(egoCenterId)
        if (center) {
          const color = REGION_COLOR[center.exec.region ?? 'CN'] ?? '#3b82f6'
          // Outer pulsing ring
          ctx.globalAlpha = 0.4
          ctx.beginPath(); ctx.arc(center.x, center.y, 22, 0, Math.PI * 2)
          ctx.strokeStyle = color; ctx.lineWidth = 1.5
          ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.stroke()
          ctx.shadowBlur = 0; ctx.globalAlpha = 1
          drawNode(center, 14, 1, '#ffffff', 28, true, true)
        }

      // ── FILTER MODE ───────────────────────────────────────────────────────
      } else if (active) {
        for (const e of edges) {
          const a = nodeById.get(e.source_id), b = nodeById.get(e.target_id)
          if (!a || !b) continue
          const aMatch   = matchesFilters(a.exec, f)
          const bMatch   = matchesFilters(b.exec, f)
          const relMatch = f.relationType === 'all' || e.type === f.relationType
          const isHov    = hoverId === e.source_id || hoverId === e.target_id
          if (isHov) {
            ctx.strokeStyle = 'rgba(148,163,184,0.8)'; ctx.lineWidth = 1.5
            ctx.shadowColor = '#94a3b8'; ctx.shadowBlur = 6
          } else if (aMatch && bMatch && relMatch) {
            ctx.strokeStyle = EDGE_COLOR[e.type] ?? 'rgba(99,102,241,0.4)'
            ctx.lineWidth = 1.4; ctx.shadowBlur = 0
          } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 0.5; ctx.shadowBlur = 0
          }
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
        ctx.shadowBlur = 0
        for (const sn of simNodes) {
          const match = matchesFilters(sn.exec, f)
          const isHov = hoverId === sn.exec.id
          const color = REGION_COLOR[sn.exec.region ?? 'CN'] ?? '#3b82f6'
          if (isHov)       drawNode(sn, 11, 1,    color, 16, true,  true)
          else if (match)  drawNode(sn, 7,  0.95, color, 10, true,  false)
          else             drawNode(sn, 4,  0.1,  null,  0,  false, false)
        }

      // ── IDLE MODE ─────────────────────────────────────────────────────────
      } else {
        for (const e of edges) {
          const a = nodeById.get(e.source_id), b = nodeById.get(e.target_id)
          if (!a || !b) continue
          const isHov = hoverId === e.source_id || hoverId === e.target_id
          if (isHov) {
            ctx.strokeStyle = 'rgba(148,163,184,0.8)'; ctx.lineWidth = 1.5
            ctx.shadowColor = '#94a3b8'; ctx.shadowBlur = 6
          } else {
            ctx.strokeStyle = EDGE_COLOR[e.type] ?? 'rgba(99,102,241,0.2)'
            ctx.lineWidth = 1; ctx.shadowBlur = 0
          }
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
        ctx.shadowBlur = 0
        for (const sn of simNodes) {
          const isHov = hoverId === sn.exec.id
          const color = REGION_COLOR[sn.exec.region ?? 'CN'] ?? '#3b82f6'
          if (isHov) drawNode(sn, 11, 1, color, 16, true, true)
          else       drawNode(sn, 7,  0.65, null, 0, false, false)
        }
      }

      ctx.globalAlpha = 1

      // Vignette
      const vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.78)
      vg.addColorStop(0, 'rgba(9,9,11,0)')
      vg.addColorStop(1, 'rgba(9,9,11,0.94)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
    }

    const loop = () => {
      const st = stateRef.current
      if (st.frame < 300) { tick(); st.frame++ }
      draw()
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)

    const hit = (mx: number, my: number) => {
      const { simNodes } = stateRef.current
      let best: SimNode | null = null, bestD = 18
      for (const n of simNodes) {
        const d = Math.hypot(mx - n.x, my - n.y)
        if (d < bestD) { best = n; bestD = d }
      }
      return best
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const n = hit(e.clientX - rect.left, e.clientY - rect.top)
      stateRef.current.hoverId = n ? n.exec.id : null
      canvas.style.cursor = n ? 'pointer' : 'default'
      setHovered(n ? n.exec : null)
    }

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const n = hit(e.clientX - rect.left, e.clientY - rect.top)
      if (n) onNodeClickRef.current(n.exec)
      else   onDeselectRef.current()
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('click', onClick)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const isLoading = previewLoading || egoLoading

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Loading badge */}
      {isLoading && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-[10px] text-zinc-500 backdrop-blur">
          <div className="h-2.5 w-2.5 animate-spin rounded-full border border-zinc-700 border-t-zinc-400" />
          {egoLoading ? '加载关系中…' : loadingLabel(filters)}
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
          <span className="font-medium text-white">{hovered.name}</span>
          <span className="mx-1.5 text-zinc-700">·</span>
          <span className="text-zinc-400">{hovered.company}</span>
        </div>
      )}

    </>
  )
}
