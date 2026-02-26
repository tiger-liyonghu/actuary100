'use client'

import { useState } from 'react'

interface Props {
  title: string
  placeholder: string
  onSubmit: (text: string) => Promise<void>
  onClose: () => void
  requireText?: boolean   // 是否强制填写文字
}

export default function FeedbackModal({ title, placeholder, onSubmit, onClose, requireText = false }: Props) {
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleSubmit = async () => {
    if (requireText && !text.trim()) return
    setState('loading')
    await onSubmit(text.trim())
    setState('done')
    setTimeout(onClose, 1200)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-80 rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>

        {state === 'done' ? (
          <div className="py-4 text-center text-sm text-emerald-400">已提交，感谢反馈！</div>
        ) : (
          <>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition hover:text-zinc-300"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={state === 'loading' || (requireText && !text.trim())}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500 disabled:opacity-40"
              >
                {state === 'loading' ? '提交中…' : '提交'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
