'use client'

import { useEffect, useRef, useState } from 'react'
import type { Executive, Relationship } from '@/types'
import { getPreviewGraph, type GraphFilters } from '@/lib/api'

interface SimNode {
  exec: Executive
  x: number; y: number
  vx: number; vy: number
}

const REGION_COLOR: Record<string, string> = {
  CN: '#3b82f6',
  HK: '#8b5cf6',
  SG: '#10b981',
}
const EDGE_COLOR: Record<string, string> = {
  colleague: 'rgba(99,102,241,0.22)',
  alumni:    'rgba(245,158,11,0.18)',
  former:    'rgba(139,92,246,0.18)',
}

// ── client-side highlight matching ──────────────────────────
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

interface Props {
  filters: GraphFilters
  containerRef: React.RefObject<HTMLDivElement | null>
  onNodeClick: (exec: Executive) => void
}

export default function BackgroundGraph({ filters, containerRef, onNodeClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const stateRef  = useRef<{
    simNodes: SimNode[]
    nodeById: Map<number, SimNode>
    edges: Relationship[]
    hoverId: number | null
    frame: number
  }>({ simNodes: [], nodeById: new Map(), edges: [], hoverId: null, frame: 0 })
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<Executive | null>(null)
  const filtersRef = useRef(filters)
  const onNodeClickRef = useRef(onNodeClick)

  // keep refs in sync so callbacks always have latest values without re-running effects
  useEffect(() => { filtersRef.current = filters }, [filters])
  useEffect(() => { onNodeClickRef.current = onNodeClick }, [onNodeClick])

  // Load data once
  useEffect(() => {
    getPreviewGraph(200, { companyType: 'all', titleType: 'all', region: 'all', relationType: 'all' }).then(({ nodes, edges }) => {
      const container = containerRef.current
      const W = container?.clientWidth  ?? window.innerWidth
      const H = container?.clientHeight ?? window.innerHeight

      stateRef.current = {
        simNodes: nodes.map(exec => ({
          exec,
          x: 60 + Math.random() * (W - 120),
          y: 60 + Math.random() * (H - 120),
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
        })),
        nodeById: new Map(),
        edges,
        hoverId: null,
        frame: 0,
      }
      stateRef.current.nodeById = new Map(stateRef.current.simNodes.map(n => [n.exec.id, n]))
      setLoading(false)
    })
  }, [])

  // Canvas + animation loop (runs once)
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

    const REPULSION  = 2000
    const SPRING_K   = 0.006
    const SPRING_LEN = 160
    const GRAVITY    = 0.0005
    const DAMPING    = 0.88

    const tick = () => {
      const { simNodes, nodeById, edges } = stateRef.current
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
          a.vx -= (dx / d) * f; a.vy -= (dy / d) * f
          b.vx += (dx / d) * f; b.vy += (dy / d) * f
        }
      }
      for (const e of edges) {
        const a = nodeById.get(e.source_id), b = nodeById.get(e.target_id)
        if (!a || !b) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01
        const f = SPRING_K * (d - SPRING_LEN)
        a.vx += (dx / d) * f; a.vy += (dy / d) * f
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f
      }
      for (const n of simNodes) {
        n.vx += (cx - n.x) * GRAVITY
        n.vy += (cy - n.y) * GRAVITY
        n.vx *= DAMPING; n.vy *= DAMPING
        n.vx = Math.max(-8, Math.min(8, n.vx))
        n.vy = Math.max(-8, Math.min(8, n.vy))
        const container = containerRef.current
        const W2 = container?.clientWidth  ?? window.innerWidth
        const H2 = container?.clientHeight ?? window.innerHeight
        n.x = Math.max(16, Math.min(W2 - 16, n.x + n.vx))
        n.y = Math.max(16, Math.min(H2 - 16, n.y + n.vy))
      }
    }

    const draw = () => {
      const { simNodes, nodeById, edges, hoverId } = stateRef.current
      const f = filtersRef.current
      const active = hasActiveFilter(f)
      const container = containerRef.current
      const W = container?.clientWidth  ?? window.innerWidth
      const H = container?.clientHeight ?? window.innerHeight
      ctx.clearRect(0, 0, W, H)

      // edges
      for (const e of edges) {
        const a = nodeById.get(e.source_id), b = nodeById.get(e.target_id)
        if (!a || !b) continue
        const aMatch    = !active || matchesFilters(a.exec, f)
        const bMatch    = !active || matchesFilters(b.exec, f)
        const relMatch  = f.relationType === 'all' || e.type === f.relationType
        const edgeMatch = aMatch && bMatch && relMatch
        const isHov     = hoverId === e.source_id || hoverId === e.target_id

        if (isHov) {
          ctx.strokeStyle = 'rgba(148,163,184,0.8)'; ctx.lineWidth = 1.5
          ctx.shadowColor = '#94a3b8'; ctx.shadowBlur = 6
        } else if (active && edgeMatch) {
          ctx.strokeStyle = EDGE_COLOR[e.type] ?? 'rgba(99,102,241,0.4)'
          ctx.lineWidth = 1.4; ctx.shadowBlur = 0
        } else if (active) {
          ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 0.5; ctx.shadowBlur = 0
        } else {
          ctx.strokeStyle = EDGE_COLOR[e.type] ?? 'rgba(99,102,241,0.2)'
          ctx.lineWidth = 1; ctx.shadowBlur = 0
        }
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      }
      ctx.shadowBlur = 0

      // nodes
      for (const sn of simNodes) {
        const match   = !active || matchesFilters(sn.exec, f)
        const isHov   = hoverId === sn.exec.id
        const r       = isHov ? 11 : match ? 7 : 4
        const color   = REGION_COLOR[sn.exec.region ?? 'CN'] ?? '#3b82f6'

        ctx.globalAlpha = isHov ? 1 : match ? (active ? 0.95 : 0.65) : 0.1

        if (isHov || (active && match)) {
          ctx.shadowColor = color; ctx.shadowBlur = isHov ? 16 : 10
        } else {
          ctx.shadowBlur = 0
        }

        const grad = ctx.createRadialGradient(sn.x - 1, sn.y - 1, 0, sn.x, sn.y, r)
        grad.addColorStop(0, 'rgba(255,255,255,0.5)')
        grad.addColorStop(1, color)
        ctx.beginPath(); ctx.arc(sn.x, sn.y, r, 0, Math.PI * 2)
        ctx.fillStyle = grad; ctx.fill()
        ctx.shadowBlur = 0; ctx.globalAlpha = 1

        if (isHov || (active && match && sn.exec.name)) {
          ctx.font = isHov ? 'bold 11px sans-serif' : '9px sans-serif'
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
          ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText(sn.exec.name, sn.x + 1, sn.y - r)
          ctx.fillStyle = isHov ? '#f8fafc' : '#cbd5e1'; ctx.fillText(sn.exec.name, sn.x, sn.y - r - 1)
        }
      }
      ctx.globalAlpha = 1
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
      let best: SimNode | null = null, bestD = 16
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

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <div className="h-3 w-3 animate-spin rounded-full border border-zinc-700 border-t-zinc-400" />
            加载关系图谱…
          </div>
        </div>
      )}
      {hovered && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
          <span className="font-medium text-white">{hovered.name}</span>
          <span className="mx-1.5 text-zinc-700">·</span>
          <span className="text-zinc-400">{hovered.company}</span>
          <span className="ml-2 text-zinc-600">点击查看 →</span>
        </div>
      )}
    </>
  )
}
