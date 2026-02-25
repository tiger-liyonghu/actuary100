import { getTopCompanies } from '@/lib/api'
import HomeClient from '@/components/HomeClient'

export default async function HomePage() {
  const companies = await getTopCompanies(24)
  return <HomeClient companies={companies} />
}
