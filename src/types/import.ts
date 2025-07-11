export interface ImportedProperty {
  address: string
  title?: string
  description?: string
  price?: number
  bedrooms?: number
  bathrooms?: number
  squareFootage?: number
  images?: string[]
  listingUrl?: string
  mls?: string
  source: 'compass' | 'manual' | 'csv' | 'url'
  sourceId?: string
  latitude?: number
  longitude?: number
  propertyType?: string
  yearBuilt?: number
}

export interface ImportResult {
  success: boolean
  imported: number
  duplicates: number
  errors: string[]
  houses: ImportedProperty[]
}

export interface ImportConfig {
  source: 'compass' | 'manual' | 'csv' | 'url'
  deduplicateByAddress: boolean
  autoGenerateTitle: boolean
  autoGenerateDescription: boolean
  selectFirstImage: boolean
}

export interface CompassCredentials {
  email?: string
  password?: string
  sessionCookie?: string
}

export interface CSVImportConfig {
  addressColumn: string
  titleColumn?: string
  descriptionColumn?: string
  priceColumn?: string
  imageUrlColumn?: string
  listingUrlColumn?: string
}

export interface URLImportConfig {
  url: string
  extractImages: boolean
  extractTitle: boolean
  extractDescription: boolean
}