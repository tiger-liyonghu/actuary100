'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Executive, Relationship } from '@/types'
import { getPreviewGraph } from '@/lib/api'

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
  colleague: 'rgba(99,102,241,0.25)',
  alumni:    'rgba(245,158,11,0.2)',
  former:    'rgba(139,92,246,0.2)',
}

export default function BackgroundGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<Executive | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    let simNodes: SimNode[] = []
    let edges: Relationship[] = []
    let nodeById = new Map<number, SimNode>()
    let frame = 0

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width  = window.innerWidth  * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width  = window.innerWidth  + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    /* ── load data ── */
    getPreviewGraph(150).then(({ nodes, edges: e }) => {
      if (!mounted) return
      edges = e
      const W = window.innerWidth
      const H = window.innerHeight

      simNodes = nodes.map(exec => ({
        exec,
        x: 80 + Math.random() * (W - 160),
        y: 80 + Math.random() * (H - 160),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
      }))
      nodeById = new Map(simNodes.map(n => [n.exec.id, n]))
      setLoading(false)
      startLoop()
    })

    /* ── force simulation ── */
    const REPULSION  = 1800
    const SPRING_K   = 0.006
    const SPRING_LEN = 180
    const GRAVITY    = 0.0006
    const DAMPING    = 0.88

    const tick = () => {
      const W = window.innerWidth, H = window.innerHeight
      const cx = W / 2, cy = H / 2

      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i], b = simNodes[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const d2 = dx * dx + dy * dy
          if (d2 > 90000) continue   // skip far pairs (perf)
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
        n.x = Math.max(16, Math.min(W - 16, n.x + n.vx))
        n.y = Math.max(16, Math.min(H - 16, n.y + n.vy))
      }
    }

    let hoverId: number | null = null

    const draw = (t: number) => {
      const W = window.innerWidth, H = window.innerHeight
      ctx.clearRect(0, 0, W, H)

      /* faint edges */
      for (const e of edges) {
        const a = nodeById.get(e.source_id), b = nodeById.get(e.target_id)
        if (!a || !b) continue
        const isHl = hoverId === e.source_id || hoverId === e.target_id
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        if (isHl) {
          ctx.strokeStyle = 'rgba(148,163,184,0.7)'
          ctx.lineWidth   = 1.5
          ctx.shadowColor = '#94a3b8'; ctx.shadowBlur = 6
        } else {
          ctx.strokeStyle = EDGE_COLOR[e.type] ?? 'rgba(99,102,241,0.15)'
          ctx.lineWidth   = 1
          ctx.shadowBlur  = 0
        }
        ctx.stroke()
      }
      ctx.shadowBlur = 0

      /* nodes */
      for (const sn of simNodes) {
        const isHl = hoverId === sn.exec.id
        const r    = isHl ? 10 : 6
        const color = REGION_COLOR[sn.exec.region ?? 'CN'] ?? '#3b82f6'

        if (isHl) {
          ctx.shadowColor = color; ctx.shadowBlur = 16
        }

        const grad = ctx.createRadialGradient(sn.x - 1, sn.y - 1, 0, sn.x, sn.y, r)
        grad.addColorStop(0, 'rgba(255,255,255,0.6)')
        grad.addColorStop(1, color)

        ctx.globalAlpha = isHl ? 1 : 0.65
        ctx.beginPath()
        ctx.arc(sn.x, sn.y, r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.shadowBlur  = 0
        ctx.globalAlpha = 1

        if (isHl) {
          ctx.font         = 'bold 11px sans-serif'
          ctx.textAlign    = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle    = 'rgba(0,0,0,0.6)'
          ctx.fillText(sn.exec.name, sn.x + 1, sn.y - r)
          ctx.fillStyle    = '#f1f5f9'
          ctx.fillText(sn.exec.name, sn.x, sn.y - r - 1)
        }
      }
      ctx.globalAlpha = 1
    }

    const loop = (t: number) => {
      if (frame < 300) { tick(); frame++ }
      draw(t)
      animRef.current = requestAnimationFrame(loop)
    }

    const startLoop = () => {
      animRef.current = requestAnimationFrame(loop)
    }

    /* ── interaction ── */
    const hit = (mx: number, my: number): SimNode | null => {
      let best: SimNode | null = null, bestD = 14
      for (const n of simNodes) {
        const d = Math.hypot(mx - n.x, my - n.y)
        if (d < bestD) { best = n; bestD = d }
      }
      return best
    }

    const onMove = (e: MouseEvent) => {
      const n = hit(e.clientX, e.clientY)
      hoverId = n ? n.exec.id : null
      canvas.style.cursor = n ? 'pointer' : 'default'
      setHovered(n ? n.exec : null)
    }
    const onClick = (e: MouseEvent) => {
      const n = hit(e.clientX, e.clientY)
      if (n) router.push(`/exec/${n.exec.id}`)
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('click', onClick)

    return () => {
      mounted = false
      cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('click', onClick)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ background: 'transparent' }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-end justify-center pb-8">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <div className="h-3 w-3 animate-spin rounded-full border border-zinc-700 border-t-zinc-400" />
            加载关系图谱…
          </div>
        </div>
      )}
      {hovered && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs shadow-xl backdrop-blur"
          style={{ left: 20, bottom: 20 }}
        >
          <div className="font-semibold text-white">{hovered.name}</div>
          <div className="mt-0.5 text-zinc-400">{hovered.title}</div>
          <div className="mt-0.5 text-zinc-500">{hovered.company}</div>
        </div>
      )}
    </>
  )
}
