import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Share target endpoint is working',
    method: 'GET',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('Share target received data')
    
    // Parse form data from share intent
    const formData = await request.formData()
    
    // Extract data from form
    let title = formData.get('title') as string || ''
    let text = formData.get('text') as string || ''
    let url = formData.get('url') as string || ''
    
    // Fix for Compass: URL is often in the text field, not url field
    if (!url && text) {
      const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        url = urlMatch[1];
        // Remove the URL from text to clean it up
        text = text.replace(urlMatch[0], '').trim();
      }
    }
    
    console.log('Extracted data:', { title, text, url })
    
    // Parse property data from shared content
    const propertyData = parseSharedPropertyData({ title, text, url })
    console.log('Parsed property data:', propertyData)
    
    // Try to extract images from the shared URL
    let imageUrl = ''
    if (url && isRealEstateUrl(url)) {
      try {
        console.log('Attempting to extract images from:', url)
        
        // Use simple fetch for Open Graph images (more reliable for share workflow)
        const imageFromOG = await extractOpenGraphImage(url)
        if (imageFromOG) {
          imageUrl = imageFromOG
          console.log('Extracted image via Open Graph:', imageUrl)
        }
        
      } catch (error) {
        console.log('Image extraction failed:', error)
        // Continue without image - not a critical failure
      }
    }
    
    // Store the shared data temporarily (you could use a database or session)
    // For now, we'll redirect to the import page with the data as URL params
    const searchParams = new URLSearchParams()
    
    if (propertyData.title && propertyData.title !== 'null') searchParams.set('title', propertyData.title)
    if (propertyData.address && propertyData.address !== 'null') searchParams.set('address', propertyData.address)
    if (propertyData.price && propertyData.price !== null) searchParams.set('price', propertyData.price.toString())
    if (propertyData.description && propertyData.description !== 'null') searchParams.set('description', propertyData.description)
    if (url && url !== 'null') searchParams.set('listing_url', url)
    if (imageUrl && imageUrl !== 'null') searchParams.set('image_url', imageUrl)
    
    // Set a flag to indicate this came from share
    searchParams.set('from_share', 'true')
    
    // Redirect to the manage page with pre-filled data
    const redirectUrl = `/manage?${searchParams.toString()}`
    console.log('Final redirect URL:', redirectUrl)
    
    try {
      const baseUrl = new URL(request.url).origin
      return NextResponse.redirect(new URL(redirectUrl, baseUrl))
    } catch (urlError) {
      console.error('URL construction error:', urlError)
      // Fallback to simple redirect
      return NextResponse.redirect(`https://houseranker.vercel.app${redirectUrl}`)
    }
    
  } catch (error) {
    console.error('Share target error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Return a proper error response for debugging
    return NextResponse.json(
      { 
        error: 'Share target failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

function parseSharedPropertyData(shared: { title: string, text: string, url: string }) {
  const result = {
    title: '',
    address: '',
    price: null as number | null,
    description: ''
  }
  
  // Ensure all string fields are never null/undefined
  const safeTitle = shared.title || ''
  const safeText = shared.text || ''
  const safeUrl = shared.url || ''
  
  // Extract from URL first (most reliable)
  if (safeUrl) {
    // Extract address from Compass URL structure
    const compassMatch = safeUrl.match(/\/listing\/([^\/]+)/)
    if (compassMatch) {
      const urlSlug = compassMatch[1]
      // Convert URL slug to readable address
      result.address = urlSlug
        .split('-')
        .slice(0, -1) // Remove the ID at the end
        .join(' ')
        .replace(/\b\w/g, l => l.toUpperCase()) // Title case
    }
  }
  
  // Parse shared text for property details
  const combinedText = `${safeTitle} ${safeText}`.trim()
  
  if (combinedText) {
    // Extract title (usually the first line or before price)
    const lines = combinedText.split('\n').filter(line => line.trim())
    if (lines.length > 0) {
      result.title = lines[0].trim()
    }
    
    // Extract price
    const priceMatch = combinedText.match(/\$[\d,]+/)
    if (priceMatch) {
      result.price = parseInt(priceMatch[0].replace(/[$,]/g, ''))
    }
    
    // Extract address if not found in URL
    if (!result.address) {
      const addressMatch = combinedText.match(/(\d+[^,\n]*(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|court|ct|place|pl|way)[^,\n]*)/i)
      if (addressMatch) {
        result.address = addressMatch[1].trim()
      }
    }
    
    // Use remaining text as description
    result.description = combinedText
  }
  
  return result
}

function isRealEstateUrl(url: string): boolean {
  return /compass\.com|zillow\.com|redfin\.com|realtor\.com|trulia\.com/i.test(url)
}

async function extractOpenGraphImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      return null
    }
    
    const html = await response.text()
    
    // Extract Open Graph image
    const ogImageMatch = html.match(/<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i)
    if (ogImageMatch) {
      let imageUrl = ogImageMatch[1]
      
      // Convert relative URLs to absolute
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      } else if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url)
        imageUrl = urlObj.origin + imageUrl
      }
      
      return imageUrl
    }
    
    // Fallback: look for Twitter card image
    const twitterImageMatch = html.match(/<meta[^>]*name=["\']twitter:image["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i)
    if (twitterImageMatch) {
      let imageUrl = twitterImageMatch[1]
      
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      } else if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url)
        imageUrl = urlObj.origin + imageUrl
      }
      
      return imageUrl
    }
    
    return null
    
  } catch (error) {
    console.log('Open Graph extraction failed:', error)
    return null
  }
}