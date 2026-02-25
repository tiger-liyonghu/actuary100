export interface CareerEntry {
  title: string
  company: string
  start_year: number | null
  end_year: number | null
  is_current: boolean
}

export interface EducationEntry {
  school: string | null
  degree: string | null
  major: string | null
  year: number | null
}

export interface PersonIdentity {
  gender: 'M' | 'F' | null
  birth_year: number | null
}

export interface Extracted {
  schools: string[]
  regulator_bg: string[]
  former_companies: string[]
}

export interface Executive {
  id: number
  name: string
  title: string | null
  company: string | null
  region: string | null
  website: string | null
  bio: string | null
  extracted: Extracted | null
  career_path: CareerEntry[] | null
  person_identity: PersonIdentity | null
  education: EducationEntry[] | null
  qualifications: string[] | null
  board_roles: string[] | null
  industry_roles: string[] | null
}

export interface Relationship {
  id: number
  source_id: number
  target_id: number
  type: 'colleague' | 'alumni' | 'former'
  strength: number
  label: string | null
}

export interface GraphNode {
  id: number
  name: string
  title: string | null
  company: string | null
  region: string | null
  isCenter?: boolean
}

export interface GraphEdge {
  source: number
  target: number
  type: 'colleague' | 'alumni' | 'former'
  label: string | null
}
