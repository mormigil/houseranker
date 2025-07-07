import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export interface ScrapingOptions {
  extractImages: boolean
  extractTitle: boolean
  extractDescription: boolean
  url: string
  timeout?: number
}

export interface ScrapedData {
  title: string
  description: string
  images: string[]
  address: string
  price: number | null
}

export async function scrapeWithPuppeteer(options: ScrapingOptions): Promise<ScrapedData> {
  let browser = null
  
  try {
    // Launch browser with @sparticuz/chromium for better compatibility
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    })

    const page = await browser.newPage()
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1366, height: 768 })
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    // Set additional headers to look more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    })

    // Navigate to the page with timeout
    await page.goto(options.url, { 
      waitUntil: 'networkidle2',
      timeout: options.timeout || 30000
    })

    // Wait a bit to let any dynamic content load
    await page.waitForTimeout(2000)

    // Extract data using browser context
    const scrapedData = await page.evaluate((opts: any) => {
      const result: ScrapedData = {
        title: '',
        description: '',
        images: [],
        address: '',
        price: null
      }

      // Extract title
      if (opts.extractTitle) {
        const titleElement = document.querySelector('title')
        if (titleElement) {
          result.title = titleElement.textContent?.trim() || ''
        }
        
        // Try h1 as fallback
        if (!result.title) {
          const h1Element = document.querySelector('h1')
          if (h1Element) {
            result.title = h1Element.textContent?.trim() || ''
          }
        }
      }

      // Extract meta description
      if (opts.extractDescription) {
        const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement
        if (metaDesc) {
          result.description = metaDesc.content?.trim() || ''
        }
        
        // Try Open Graph description as fallback
        if (!result.description) {
          const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement
          if (ogDesc) {
            result.description = ogDesc.content?.trim() || ''
          }
        }
      }

      // Extract images
      if (opts.extractImages) {
        const images = Array.from(document.querySelectorAll('img'))
          .map(img => img.src)
          .filter(src => {
            if (!src || src.startsWith('data:')) return false
            // Filter out common non-property images
            const excludePatterns = ['logo', 'icon', 'avatar', 'profile', 'button', 'sprite']
            return !excludePatterns.some(pattern => src.toLowerCase().includes(pattern))
          })
          .filter(src => {
            // Filter by image dimensions if available
            const img = document.querySelector(`img[src="${src}"]`) as HTMLImageElement
            if (img && (img.naturalWidth < 200 || img.naturalHeight < 150)) {
              return false
            }
            return true
          })
          .slice(0, 10) // Limit to first 10 images

        result.images = images
      }

      // Enhanced address extraction using multiple strategies
      const addressSelectors = [
        // Compass-specific selectors
        '[data-testid="property-address"]',
        '.address',
        '.property-address',
        '.listing-address',
        '[class*="address"]',
        '[data-address]',
        
        // Generic real estate selectors
        'h1:has-text("Street")',
        'h1:has-text("Avenue")',
        'h1:has-text("Road")',
        'h1:has-text("Drive")',
        'h2:has-text("Street")',
        'h2:has-text("Avenue")',
        
        // JSON-LD structured data
        'script[type="application/ld+json"]'
      ]

      for (const selector of addressSelectors) {
        if (selector.includes('script')) {
          // Handle JSON-LD structured data
          const scripts = document.querySelectorAll(selector)
          for (const script of scripts) {
            try {
              const data = JSON.parse(script.textContent || '')
              if (data.address) {
                if (typeof data.address === 'string') {
                  result.address = data.address
                  break
                } else if (data.address.streetAddress) {
                  result.address = data.address.streetAddress
                  break
                }
              }
            } catch (e) {
              // Continue to next script
            }
          }
        } else {
          const element = document.querySelector(selector)
          if (element) {
            const text = element.textContent?.trim()
            if (text && text.length > 10 && /\d/.test(text)) {
              result.address = text
              break
            }
          }
        }
      }

      // Extract price using multiple strategies
      const priceSelectors = [
        '[data-testid="price"]',
        '.price',
        '.listing-price',
        '[class*="price"]',
        '[data-price]'
      ]

      for (const selector of priceSelectors) {
        const element = document.querySelector(selector)
        if (element) {
          const text = element.textContent?.trim()
          if (text) {
            const priceMatch = text.match(/\$[\d,]+/)
            if (priceMatch) {
              const price = parseInt(priceMatch[0].replace(/[$,]/g, ''))
              if (price > 50000) {
                result.price = price
                break
              }
            }
          }
        }
      }

      // Fallback: search page text for price patterns
      if (!result.price) {
        const bodyText = document.body.textContent || ''
        const priceMatches = bodyText.match(/\$\s*([\d,]+)/g)
        if (priceMatches) {
          const prices = priceMatches
            .map(match => parseInt(match.replace(/[$,\s]/g, '')))
            .filter(price => price > 100000) // Reasonable house price threshold
          
          if (prices.length > 0) {
            result.price = Math.max(...prices) // Use the highest price found
          }
        }
      }

      return result
    }, JSON.parse(JSON.stringify(options)))

    return scrapedData

  } catch (error) {
    throw new Error(`Puppeteer scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}