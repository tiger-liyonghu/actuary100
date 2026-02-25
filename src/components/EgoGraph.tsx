'use client'

import { useEffect, useRef, useState } from 'react'
import type { Executive, Relationship } from '@/types'
import { useRouter } from 'next/navigation'

interface Props {
  center: Executive
  nodes: Executive[]
  edges: Relationship[]
}

const REGION_COLORS: Record<string, string> = {
  CN: '#3b82f6',
  HK: '#8b5cf6',
  SG: '#10b981',
}

const EDGE_COLORS: Record<string, string> = {
  colleague: '#4b5563',
  alumni: '#d97706',
  former: '#6d28d9',
}

export default function EgoGraph({ center, nodes, edges }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Executive | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const router = useRouter()

  // Layout: center in middle, neighbors in a circle
  const positions = useRef<Map<number, { x: number; y: number }>>(new Map())

  const computeLayout = (width: number, height: number) => {
    const cx = width / 2
    const cy = height / 2
    const neighbors = nodes.filter(n => n.id !== center.id)
    const r = Math.min(width, height) * 0.38
    const pos = new Map<number, { x: number; y: number }>()
    pos.set(center.id, { x: cx, y: cy })
    neighbors.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / neighbors.length - Math.PI / 2
      pos.set(n.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
    })
    return pos
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const canvas = document.createElement('canvas')
    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = container.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    container.innerHTML = ''
    container.appendChild(canvas)

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const pos = computeLayout(w, h)
    positions.current = pos

    const draw = (highlightId: number | null = null) => {
      ctx.clearRect(0, 0, w, h)

      // Draw edges
      for (const edge of edges) {
        const from = pos.get(edge.source_id)
        const to = pos.get(edge.target_id)
        if (!from || !to) continue
        const isHighlighted =
          highlightId !== null &&
          (edge.source_id === highlightId || edge.target_id === highlightId)
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = isHighlighted
          ? EDGE_COLORS[edge.type] ?? '#6b7280'
          : 'rgba(75,85,99,0.3)'
        ctx.lineWidth = isHighlighted ? 2 : 1
        ctx.stroke()
      }

      // Draw nodes
      for (const node of nodes) {
        const p = pos.get(node.id)
        if (!p) continue
        const isCenter = node.id === center.id
        const isHighlighted = highlightId === node.id
        const r = isCenter ? 20 : 10

        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fillStyle = isCenter
          ? '#f59e0b'
          : isHighlighted
          ? '#60a5fa'
          : REGION_COLORS[node.region ?? 'CN'] ?? '#3b82f6'
        ctx.globalAlpha = highlightId !== null && !isCenter && node.id !== highlightId ? 0.3 : 1
        ctx.fill()
        ctx.globalAlpha = 1

        // Label
        if (isCenter || isHighlighted || nodes.length < 30) {
          ctx.fillStyle = '#f4f4f5'
          ctx.font = isCenter ? 'bold 12px sans-serif' : '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(node.name, p.x, p.y + r + 10)
        }
      }
    }

    draw()

    // Mouse interactions
    const getNodeAt = (mx: number, my: number): Executive | null => {
      for (const node of nodes) {
        const p = pos.get(node.id)
        if (!p) continue
        const r = node.id === center.id ? 20 : 10
        const dist = Math.hypot(mx - p.x, my - p.y)
        if (dist <= r) return node
      }
      return null
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const node = getNodeAt(mx, my)
      if (node) {
        canvas.style.cursor = 'pointer'
        setHoveredId(node.id)
        draw(node.id)
      } else {
        canvas.style.cursor = 'default'
        setHoveredId(null)
        draw()
      }
    }

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const node = getNodeAt(mx, my)
      if (node) setSelected(node)
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('click', onClick)

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('click', onClick)
    }
  }, [center, nodes, edges])

  const relTypeCounts = { colleague: 0, alumni: 0, former: 0 }
  for (const e of edges) {
    if (e.type in relTypeCounts) relTypeCounts[e.type as keyof typeof relTypeCounts]++
  }

  return (
    <div className="relative h-full w-full">
      {/* Canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 rounded-lg bg-zinc-900/80 p-3 text-xs backdrop-blur">
        <div className="mb-1 font-semibold text-zinc-300">关系类型</div>
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="h-0.5 w-4" style={{ backgroundColor: color }} />
            <span className="text-zinc-400">
              {type === 'colleague' ? '同事' : type === 'alumni' ? '校友' : '前同事'}
              {' '}({relTypeCounts[type as keyof typeof relTypeCounts]})
            </span>
          </div>
        ))}
        <div className="mt-2 border-t border-zinc-700 pt-2 font-semibold text-zinc-300">地区</div>
        {Object.entries(REGION_COLORS).map(([r, c]) => (
          <div key={r} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />
            <span className="text-zinc-400">{r === 'CN' ? '中国大陆' : r === 'HK' ? '香港' : '新加坡'}</span>
          </div>
        ))}
      </div>

      {/* Node count */}
      <div className="absolute right-4 top-4 rounded-lg bg-zinc-900/80 px-3 py-2 text-xs text-zinc-400 backdrop-blur">
        {nodes.length} 人 · {edges.length} 条关系
      </div>

      {/* Selected node panel */}
      {selected && (
        <div className="absolute bottom-4 right-4 w-64 rounded-xl border border-zinc-700 bg-zinc-900/95 p-4 backdrop-blur shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-white">{selected.name}</div>
              <div className="mt-0.5 text-xs text-zinc-400">{selected.title}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{selected.company}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-zinc-600 hover:text-zinc-300">✕</button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => router.push(`/exec/${selected.id}`)}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              查看详情
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
