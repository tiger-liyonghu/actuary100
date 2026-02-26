import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import path from 'path'
import { NextResponse } from 'next/server'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SCRIPTS_DIR = path.resolve(process.cwd(), '../scripts')

const ext = 'mjs'
const WORKFLOWS: Record<string, { name: string; file: string; envAllowed: string[] }> = {
  '05_insurers': { name: '持牌险企名单采集', file: `05_scrape_licensed_insurers.${ext}`, envAllowed: ['MARKET', 'DRY_RUN'] },
  '02_scrape':   { name: '公司简介采集',     file: `02_scrape_company_profiles.${ext}`,  envAllowed: ['LIMIT', 'MARKET'] },
  '03_former':   { name: '前同事关系挖掘',   file: `03_mine_former_colleagues.${ext}`,   envAllowed: ['DRY_RUN', 'MIN_YEAR'] },
  '04_alumni':   { name: '校友关系挖掘',     file: `04_mine_alumni.${ext}`,              envAllowed: ['DRY_RUN', 'MIN_COUNT'] },
}

export async function POST(request: Request) {
  const body = await request.json()
  const { workflowId, env: envParams = {} } = body

  const wf = WORKFLOWS[workflowId]
  if (!wf) {
    return NextResponse.json({ error: `未知工作流: ${workflowId}` }, { status: 400 })
  }

  // 只允许白名单环境变量传入
  const safeEnv: Record<string, string> = {}
  for (const key of wf.envAllowed) {
    if (envParams[key] !== undefined) safeEnv[key] = String(envParams[key])
  }

  // 插入运行记录
  const { data: run, error: insertErr } = await sb
    .from('workflow_runs')
    .insert({
      workflow_id:   workflowId,
      workflow_name: wf.name,
      status:        'running',
      started_at:    new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const runId = run.id

  // 异步启动子进程（不等待完成）
  const proc = spawn('node', [wf.file], {
    cwd: SCRIPTS_DIR,
    env: { ...process.env, ...safeEnv, WORKFLOW_RUN_ID: String(runId) },
    stdio: 'pipe',
  })

  let output = ''
  proc.stdout.on('data', (d: Buffer) => { output += d.toString() })
  proc.stderr.on('data', (d: Buffer) => { output += d.toString() })

  proc.on('close', async (code) => {
    const success = code === 0
    // 解析输出中的摘要行（如 "完成: 12 ✓  失败: 3 ✗"）
    const summaryMatch = output.match(/完成.*?✓.*?失败.*?✗[^\n]*/s)
    await sb.from('workflow_runs').update({
      status:       success ? 'completed' : 'failed',
      progress_pct: success ? 100 : undefined,
      summary:      summaryMatch?.[0]?.trim() ?? (success ? '已完成' : ''),
      error_text:   success ? null : output.slice(-1000),
      completed_at: new Date().toISOString(),
    }).eq('id', runId)
  })

  return NextResponse.json({ runId, workflowId, workflowName: wf.name })
}

export async function GET() {
  const { data, error } = await sb
    .from('workflow_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data })
}
