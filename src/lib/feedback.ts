import { supabase } from './supabase'

/** 获取或生成浏览器会话 ID（存 localStorage） */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let sid = localStorage.getItem('_sid')
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('_sid', sid)
  }
  return sid
}

/** 我认识：记录到 user_known */
export async function submitKnown(execId: number): Promise<void> {
  await supabase.from('user_known').insert({
    exec_id: execId,
    session_id: getSessionId(),
  })
}

/** 报错 / 信息过时：记录到 user_reports */
export async function submitReport(
  execId: number,
  type: 'error' | 'outdated',
  note?: string
): Promise<void> {
  await supabase.from('user_reports').insert({
    exec_id: execId,
    type,
    note: note ?? null,
    session_id: getSessionId(),
  })
}

/** 提意见（全站通用） */
export async function submitFeedback(message: string): Promise<void> {
  await supabase.from('user_feedback').insert({
    message,
    session_id: getSessionId(),
  })
}
