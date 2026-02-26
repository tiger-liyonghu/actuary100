import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '保险行业高管关系图谱',
  description: '中国及亚太保险行业高管关系网络',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  )
}
