import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/auth'
import { scrapeWithPuppeteer } from '@/lib/import/puppeteer-scraper'

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { url, extractImages, extractTitle, extractDescription } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Try Puppeteer-based scraping first for real estate sites
    const isRealEstateSite = /compass\.com|zillow\.com|redfin\.com|realtor\.com|trulia\.com/i.test(url)
    
    let extractedData
    let usedPuppeteer = false

    if (isRealEstateSite) {
      try {
        console.log('Using Puppeteer for real estate site:', url)
        extractedData = await scrapeWithPuppeteer({
          url,
          extractImages,
          extractTitle,
          extractDescription,
          timeout: 30000
        })
        usedPuppeteer = true
      } catch (puppeteerError) {
        console.log('Puppeteer failed, falling back to fetch:', puppeteerError)
        // Fall through to regular fetch
      }
    }

    // Fallback to regular fetch if Puppeteer failed or not a real estate site
    if (!extractedData) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        })

        if (!response.ok) {
          return NextResponse.json({ 
            error: `Failed to fetch URL: ${response.status} ${response.statusText}. The site may be blocking automated requests.`,
            suggestion: 'Try copying the property details manually or use a CSV import instead.'
          }, { status: 400 })
        }

        const html = await response.text()
        
        // Check if we got blocked or redirected
        if (html.includes('blocked') || html.includes('captcha') || html.includes('Access Denied')) {
          return NextResponse.json({ 
            error: 'The website is blocking automated requests. This is common with real estate sites.',
            suggestion: 'Try copying the property details manually or use a CSV import instead.'
          }, { status: 400 })
        }
        
        // Parse the HTML and extract structured data
        extractedData = parseHTML(html, {
          extractImages,
          extractTitle,
          extractDescription,
          url,
          baseUrl: new URL(url).origin
        })
      } catch (fetchError) {
        return NextResponse.json({ 
          error: `Failed to scrape URL: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          suggestion: 'The site may be blocking requests. Try copying the property details manually.'
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
      url,
      method: usedPuppeteer ? 'puppeteer' : 'fetch'
    })

  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json({ 
      error: 'Failed to scrape URL' 
    }, { status: 500 })
  }
}

function parseHTML(html: string, options: any) {
  const result: any = {
    title: '',
    description: '',
    images: [],
    address: '',
    price: null
  }

  // Extract title
  if (options.extractTitle) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
      result.title = titleMatch[1].trim().replace(/\s+/g, ' ')
    }
  }

  // Extract meta description
  if (options.extractDescription) {
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
    if (metaDescMatch) {
      result.description = metaDescMatch[1].trim()
    }
  }

  // Extract images with better filtering
  if (options.extractImages) {
    const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || []
    result.images = imgMatches
      .map(img => {
        const srcMatch = img.match(/src=["']([^"']+)["']/)
        return srcMatch ? srcMatch[1] : null
      })
      .filter(src => {
        if (!src) return false
        // Filter out common non-property images
        const excludePatterns = ['logo', 'icon', 'avatar', 'profile', 'button', 'svg', 'sprite']
        return !excludePatterns.some(pattern => src.toLowerCase().includes(pattern))
      })
      .map(src => {
        // Convert relative URLs to absolute
        if (src && src.startsWith('//')) {
          return 'https:' + src
        } else if (src && src.startsWith('/')) {
          const url = new URL(options.baseUrl || 'https://www.compass.com')
          return url.origin + src
        }
        return src
      })
      .slice(0, 5)
  }

  // Enhanced address extraction for real estate sites
  const addressPatterns = [
    // Compass specific patterns
    /"address":"([^"]+)"/i,
    /"streetAddress":"([^"]+)"/i,
    /"address":\s*"([^"]+)"/i,
    
    // Generic real estate patterns
    /<h1[^>]*>([^<]*\d+[^<]*(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|court|ct|place|pl|way)[^<]*)<\/h1>/i,
    /<div[^>]*class="[^"]*address[^"]*"[^>]*>([^<]+)</i,
    /<span[^>]*class="[^"]*address[^"]*"[^>]*>([^<]+)</i,
    /<div[^>]*data-[^>]*address[^>]*>([^<]+)</i,
    
    // JSON-LD structured data
    /"streetAddress":\s*"([^"]+)"/i,
    /"address":\s*{\s*"streetAddress":\s*"([^"]+)"/i,
    
    // Meta tags
    /<meta[^>]*property=["']og:street-address["'][^>]*content=["']([^"']+)["']/i,
    
    // From title if it contains address
    /([^|,-]+(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|court|ct|place|pl|way)[^|,-]*)/i
  ]

  for (const pattern of addressPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      let address = match[1].trim().replace(/\s+/g, ' ')
      // Clean up common issues
      address = address.replace(/^["']|["']$/g, '') // Remove quotes
      address = address.replace(/\\n|\\r/g, ' ') // Remove escaped newlines
      address = address.replace(/\s+/g, ' ') // Normalize whitespace
      
      if (address.length > 10 && /\d/.test(address)) { // Must contain a number and be reasonable length
        result.address = address
        break
      }
    }
  }

  // Enhanced price extraction
  const pricePatterns = [
    // JSON data patterns (more reliable)
    /"price":\s*(\d+)/i,
    /"listPrice":\s*(\d+)/i,
    /"amount":\s*(\d+)/i,
    
    // Display price patterns
    /\$\s*([\d,]+)\s*(?:\/|per)/i, // $1,234,567 / month or $1,234,567 per
    /Price:\s*\$\s*([\d,]+)/i,
    /Listed at\s*\$\s*([\d,]+)/i,
    
    // General price patterns
    /\$\s*([\d,]+)/g
  ]

  for (const pattern of pricePatterns) {
    const matches = html.match(pattern)
    if (matches) {
      if (pattern.global) {
        // For global patterns, find the largest price
        const prices = Array.from(html.matchAll(pattern))
          .map(match => parseInt(match[1].replace(/,/g, '')))
          .filter(price => price > 50000) // Filter out small numbers that aren't prices
        
        if (prices.length > 0) {
          result.price = Math.max(...prices)
          break
        }
      } else {
        // For specific patterns, use the first match
        const price = parseInt(matches[1].replace(/,/g, ''))
        if (price > 50000) {
          result.price = price
          break
        }
      }
    }
  }

  // If we couldn't extract address from patterns, try to extract from URL
  if (!result.address && options.url) {
    const urlMatch = options.url.match(/\/([^\/]*(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|court|ct|place|pl)[^\/]*)/i)
    if (urlMatch) {
      result.address = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    }
  }

  return result
}