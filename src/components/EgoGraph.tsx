'use client'

import { useEffect, useRef, useState } from 'react'
import type { Executive, Relationship } from '@/types'
import { useRouter } from 'next/navigation'

interface SimNode {
  exec: Executive
  x: number
  y: number
  vx: number
  vy: number
  fx?: number
  fy?: number
}

interface Props {
  center: Executive
  nodes: Executive[]
  edges: Relationship[]
}

const REGION_COLOR: Record<string, string> = {
  CN: '#60a5fa',
  HK: '#a78bfa',
  SG: '#34d399',
}

const EDGE_COLOR: Record<string, string> = {
  colleague: '#475569',
  alumni:    '#b45309',
  former:    '#6d28d9',
}

const EDGE_GLOW: Record<string, string> = {
  colleague: '#94a3b8',
  alumni:    '#fbbf24',
  former:    '#8b5cf6',
}

export default function EgoGraph({ center, nodes, edges }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef      = useRef<number>(0)
  const stateRef     = useRef<{
    simNodes: SimNode[]
    nodeById: Map<number, SimNode>
    highlightId: number | null
    frame: number
  } | null>(null)
  const [selected, setSelected] = useState<Executive | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || nodes.length === 0) return

    /* ── canvas setup ── */
    const dpr = window.devicePixelRatio || 1
    const W   = container.clientWidth
    const H   = container.clientHeight
    const canvas = document.createElement('canvas')
    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.cssText = `width:${W}px;height:${H}px;position:absolute;inset:0;`
    container.innerHTML = ''
    container.appendChild(canvas)
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const CX = W / 2
    const CY = H / 2

    /* ── initial node positions ── */
    const simNodes: SimNode[] = nodes.map((exec, i) => {
      if (exec.id === center.id)
        return { exec, x: CX, y: CY, vx: 0, vy: 0, fx: CX, fy: CY }
      const angle = (2 * Math.PI * i) / (nodes.length - 1)
      const r = 90 + Math.random() * 50
      return {
        exec,
        x: CX + r * Math.cos(angle),
        y: CY + r * Math.sin(angle),
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
      }
    })
    const nodeById = new Map(simNodes.map(n => [n.exec.id, n]))
    stateRef.current = { simNodes, nodeById, highlightId: null, frame: 0 }

    /* ── force simulation ── */
    const REPULSION  = 4000
    const SPRING_K   = 0.018
    const SPRING_LEN = 130
    const GRAVITY    = 0.004
    const DAMPING    = 0.82

    const tick = () => {
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i], b = simNodes[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const d  = Math.sqrt(dx * dx + dy * dy) || 0.01
          const f  = REPULSION / (d * d)
          if (!a.fx) { a.vx -= (dx / d) * f; a.vy -= (dy / d) * f }
          if (!b.fx) { b.vx += (dx / d) * f; b.vy += (dy / d) * f }
        }
      }
      for (const e of edges) {
        const a = nodeById.get(e.source_id), b = nodeById.get(e.target_id)
        if (!a || !b) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const d  = Math.sqrt(dx * dx + dy * dy) || 0.01
        const f  = SPRING_K * (d - SPRING_LEN)
        if (!a.fx) { a.vx += (dx / d) * f; a.vy += (dy / d) * f }
        if (!b.fx) { b.vx -= (dx / d) * f; b.vy -= (dy / d) * f }
      }
      for (const n of simNodes) {
        if (n.fx !== undefined) { n.x = n.fx; n.y = n.fy!; continue }
        n.vx += (CX - n.x) * GRAVITY
        n.vy += (CY - n.y) * GRAVITY
        n.vx *= DAMPING; n.vy *= DAMPING
        n.vx = Math.max(-12, Math.min(12, n.vx))
        n.vy = Math.max(-12, Math.min(12, n.vy))
        n.x  = Math.max(24, Math.min(W - 24, n.x + n.vx))
        n.y  = Math.max(24, Math.min(H - 24, n.y + n.vy))
      }
    }

    /* ── draw ── */
    const draw = (hlId: number | null, t: number) => {
      /* background */
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.6)
      bg.addColorStop(0,   'rgba(30,41,59,0.6)')
      bg.addColorStop(1,   'rgba(9,9,11,0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      /* edges */
      for (const e of edges) {
        const a = nodeById.get(e.source_id), b = nodeById.get(e.target_id)
        if (!a || !b) continue
        const isHl = hlId === e.source_id || hlId === e.target_id
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        if (isHl) {
          ctx.strokeStyle = EDGE_GLOW[e.type] ?? '#94a3b8'
          ctx.lineWidth   = 2
          ctx.globalAlpha = 0.9
          ctx.shadowColor = EDGE_GLOW[e.type] ?? '#94a3b8'
          ctx.shadowBlur  = 8
        } else {
          ctx.strokeStyle = EDGE_COLOR[e.type] ?? '#475569'
          ctx.lineWidth   = 1
          ctx.globalAlpha = hlId !== null ? 0.08 : 0.35
          ctx.shadowBlur  = 0
        }
        ctx.stroke()

        /* 高亮时在连线中点画关系标签 */
        if (isHl) {
          const LABEL: Record<string, string> = { colleague: '同事', alumni: '校友', former: '前同事' }
          const label = LABEL[e.type]
          if (label) {
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            ctx.shadowBlur  = 0
            ctx.globalAlpha = 0.9
            ctx.font        = '10px sans-serif'
            ctx.textAlign   = 'center'
            ctx.textBaseline = 'middle'
            /* 背景小胶囊 */
            const tw = ctx.measureText(label).width + 8
            const bx = mx - tw / 2, by = my - 8, bw = tw, bh = 16, br = 4
            ctx.fillStyle = 'rgba(9,9,11,0.75)'
            ctx.beginPath()
            ctx.moveTo(bx + br, by)
            ctx.lineTo(bx + bw - br, by)
            ctx.arcTo(bx + bw, by, bx + bw, by + br, br)
            ctx.lineTo(bx + bw, by + bh - br)
            ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br)
            ctx.lineTo(bx + br, by + bh)
            ctx.arcTo(bx, by + bh, bx, by + bh - br, br)
            ctx.lineTo(bx, by + br)
            ctx.arcTo(bx, by, bx + br, by, br)
            ctx.closePath()
            ctx.fill()
            /* 文字 */
            ctx.fillStyle = EDGE_GLOW[e.type] ?? '#94a3b8'
            ctx.fillText(label, mx, my)
          }
        }
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1

      /* nodes */
      for (const sn of simNodes) {
        const isCenter = sn.exec.id === center.id
        const isHl     = hlId === sn.exec.id
        const r        = isCenter ? 18 : 9
        const color    = isCenter ? '#f59e0b' : (REGION_COLOR[sn.exec.region ?? 'CN'] ?? '#60a5fa')

        ctx.globalAlpha = hlId !== null && !isCenter && !isHl ? 0.22 : 1

        /* glow */
        if (isCenter) {
          /* pulsing outer ring */
          const pulse = 0.45 + 0.35 * Math.sin(t / 600)
          ctx.beginPath()
          ctx.arc(sn.x, sn.y, r + 10 + 4 * Math.sin(t / 600), 0, Math.PI * 2)
          ctx.strokeStyle = '#f59e0b'
          ctx.lineWidth   = 2
          ctx.globalAlpha = pulse * (hlId !== null ? 1 : 0.7)
          ctx.shadowColor = '#f59e0b'
          ctx.shadowBlur  = 18
          ctx.stroke()
          ctx.globalAlpha = hlId !== null && !isCenter ? 0.22 : 1
          ctx.shadowBlur  = 0
        }

        if (isCenter || isHl) {
          ctx.shadowColor = color
          ctx.shadowBlur  = isCenter ? 24 : 14
        }

        /* node fill with radial gradient */
        const grad = ctx.createRadialGradient(sn.x - r * 0.3, sn.y - r * 0.3, 0, sn.x, sn.y, r)
        grad.addColorStop(0, isCenter ? '#fde68a' : (isHl ? '#fff' : lighten(color)))
        grad.addColorStop(1, color)
        ctx.beginPath()
        ctx.arc(sn.x, sn.y, r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        if (isCenter) {
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'
          ctx.lineWidth   = 1.5
          ctx.stroke()
        }

        ctx.shadowBlur  = 0
        ctx.globalAlpha = 1

        /* labels */
        const showLabel = isCenter || isHl || nodes.length <= 25
        if (showLabel) {
          ctx.font          = isCenter ? 'bold 12px sans-serif' : '10px sans-serif'
          ctx.textAlign     = 'center'
          ctx.textBaseline  = 'top'
          /* text shadow */
          ctx.fillStyle     = 'rgba(0,0,0,0.7)'
          ctx.fillText(sn.exec.name, sn.x + 1, sn.y + r + 5)
          ctx.fillStyle     = isCenter ? '#fef3c7' : (isHl ? '#ffffff' : '#cbd5e1')
          ctx.fillText(sn.exec.name, sn.x, sn.y + r + 4)
        }
      }

      ctx.globalAlpha = 1
    }

    /* ── animation loop ── */
    const animate = (t: number) => {
      const st = stateRef.current!
      if (st.frame < 250) { tick(); st.frame++ }
      draw(st.highlightId, t)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)

    /* ── interaction ── */
    const hitNode = (mx: number, my: number): SimNode | null => {
      for (const n of simNodes) {
        const r = n.exec.id === center.id ? 18 : 9
        if (Math.hypot(mx - n.x, my - n.y) <= r + 4) return n
      }
      return null
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const n = hitNode(e.clientX - rect.left, e.clientY - rect.top)
      stateRef.current!.highlightId = n ? n.exec.id : null
      canvas.style.cursor = n ? 'pointer' : 'default'
    }
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const n = hitNode(e.clientX - rect.left, e.clientY - rect.top)
      if (n) setSelected(n.exec)
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(animRef.current!)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('click', onClick)
    }
  }, [center.id, nodes.length, edges.length])

  /* ── edge type counts ── */
  const counts = { colleague: 0, alumni: 0, former: 0 }
  for (const e of edges) if (e.type in counts) counts[e.type as keyof typeof counts]++

  /* ── selected 与 center 之间的关系 ── */
  const selectedRelType = selected
    ? edges.find(e =>
        (e.source_id === selected.id && e.target_id === center.id) ||
        (e.target_id === selected.id && e.source_id === center.id)
      )?.type ?? null
    : null

  const REL_LABEL: Record<string, string> = { colleague: '同事', alumni: '校友', former: '前同事' }
  const REL_COLOR: Record<string, string> = { colleague: '#94a3b8', alumni: '#fbbf24', former: '#8b5cf6' }

  return (
    <div className="relative h-full w-full bg-zinc-950">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Legend – hidden on mobile */}
      <div className="absolute bottom-5 left-5 hidden rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-xs backdrop-blur-sm md:block">
        <div className="mb-1.5 font-semibold text-zinc-400">关系类型</div>
        {([['colleague','同事'], ['alumni','校友'], ['former','前同事']] as const).map(([t, label]) => (
          <div key={t} className="flex items-center gap-2 py-0.5">
            <div className="h-px w-5 rounded" style={{ backgroundColor: EDGE_GLOW[t], boxShadow: `0 0 4px ${EDGE_GLOW[t]}` }} />
            <span className="text-zinc-400">{label} <span className="text-zinc-600">{counts[t]}</span></span>
          </div>
        ))}
        <div className="mt-2 mb-1.5 border-t border-zinc-800 pt-2 font-semibold text-zinc-400">地区</div>
        {([['CN','中国大陆'], ['HK','香港'], ['SG','新加坡']] as const).map(([r, label]) => (
          <div key={r} className="flex items-center gap-2 py-0.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REGION_COLOR[r], boxShadow: `0 0 5px ${REGION_COLOR[r]}` }} />
            <span className="text-zinc-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="absolute right-4 top-4 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-500 backdrop-blur-sm md:right-5 md:top-5">
        {nodes.length} 人 &nbsp;·&nbsp; {edges.length} 条关系
      </div>

      {/* Selected panel – mobile: full-width bottom card, desktop: bottom-right float */}
      {selected && (
        <div className={
          isMobile
            ? 'absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-zinc-700 bg-zinc-900/98 p-4 shadow-2xl backdrop-blur-md'
            : 'absolute bottom-5 right-5 w-64 rounded-xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-sm'
        }>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: REGION_COLOR[selected.region ?? 'CN'], boxShadow: `0 0 10px ${REGION_COLOR[selected.region ?? 'CN']}` }}
              >
                {selected.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{selected.name}</span>
                  {selectedRelType && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ color: REL_COLOR[selectedRelType], backgroundColor: `${REL_COLOR[selectedRelType]}22`, border: `1px solid ${REL_COLOR[selectedRelType]}55` }}
                    >
                      {REL_LABEL[selectedRelType]}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-zinc-400 line-clamp-2">{selected.title}</div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="flex-shrink-0 text-zinc-600 hover:text-zinc-300">✕</button>
          </div>
          {selected.company && (
            <div className="mt-2 text-xs text-zinc-500">{selected.company}</div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => router.push(`/exec/${selected.id}`)}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
            >
              查看详情 →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function lighten(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + 60)
  const g = Math.min(255, ((n >> 8)  & 0xff) + 60)
  const b = Math.min(255, ((n >> 0)  & 0xff) + 60)
  return `rgb(${r},${g},${b})`
}
