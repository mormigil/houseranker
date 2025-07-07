export interface House {
  id: string
  title: string
  description?: string
  image_url?: string
  rank?: number | null
  is_ranked: boolean
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateHouseRequest {
  title: string
  description?: string
  image_url?: string
}

export interface RankingComparison {
  house: House
  compareAgainst: House
  userChoice: 'house' | 'compareAgainst'
}