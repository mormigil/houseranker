import { NextRequest } from 'next/server'

export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const validApiKey = process.env.APP_API_KEY
  
  if (!validApiKey) {
    console.warn('APP_API_KEY environment variable not configured')
    return false
  }
  
  if (!apiKey) {
    return false
  }
  
  return apiKey === validApiKey
}

export function getApiKeyFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-api-key')
}