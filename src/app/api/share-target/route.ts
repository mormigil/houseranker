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
    
    // Log all available form data
    console.log('All form data keys:', Array.from(formData.keys()))
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value)
    }
    
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
    
    // Try to extract images and additional details from the shared URL
    let imageUrl = ''
    let additionalDetails = null
    if (url && isRealEstateUrl(url)) {
      try {
        console.log('Attempting to extract data from:', url)
        
        const pageData = await extractPropertyData(url)
        if (pageData.imageUrl) {
          imageUrl = pageData.imageUrl
          console.log('Extracted image via Open Graph:', imageUrl)
        }
        if (pageData.details) {
          additionalDetails = pageData.details
          console.log('Extracted additional details:', additionalDetails)
        }
        
      } catch (error) {
        console.log('Data extraction failed:', error)
        // Continue without additional data - not a critical failure
      }
    }
    
    // Store the shared data temporarily (you could use a database or session)
    // For now, we'll redirect to the import page with the data as URL params
    const searchParams = new URLSearchParams()
    
    // Truncate very long strings to avoid URL length issues
    if (propertyData.title && propertyData.title !== 'null') {
      searchParams.set('title', propertyData.title.substring(0, 200))
    }
    if (propertyData.address && propertyData.address !== 'null') {
      searchParams.set('address', propertyData.address.substring(0, 100))
    }
    if (propertyData.price && propertyData.price !== null) {
      searchParams.set('price', propertyData.price.toString())
    }
    // Enhance description with additional details if available
    let enhancedDescription = propertyData.description || ''
    if (additionalDetails) {
      const extraInfo = []
      
      if (additionalDetails.sqft) {
        extraInfo.push(`${additionalDetails.sqft.toLocaleString()} sqft`)
      }
      if (additionalDetails.lotSize) {
        extraInfo.push(`${additionalDetails.lotSize} acres`)
      }
      if (additionalDetails.yearBuilt) {
        extraInfo.push(`Built ${additionalDetails.yearBuilt}`)
      }
      if (additionalDetails.description && additionalDetails.description !== enhancedDescription) {
        extraInfo.push(additionalDetails.description)
      }
      
      if (extraInfo.length > 0) {
        enhancedDescription = enhancedDescription ? 
          `${enhancedDescription}\n\n${extraInfo.join(' • ')}` : 
          extraInfo.join(' • ')
      }
    }
    
    if (enhancedDescription && enhancedDescription !== 'null') {
      searchParams.set('description', enhancedDescription.substring(0, 500))
    }
    if (url && url !== 'null') {
      searchParams.set('listing_url', url)
    }
    if (imageUrl && imageUrl !== 'null') {
      searchParams.set('image_url', imageUrl)
    }
    
    // Set a flag to indicate this came from share
    searchParams.set('from_share', 'true')
    
    // Redirect to the manage page with pre-filled data
    const redirectUrl = `/manage?${searchParams.toString()}`
    
    try {
      const baseUrl = new URL(request.url).origin
      return NextResponse.redirect(new URL(redirectUrl, baseUrl), 302)
    } catch (urlError) {
      console.error('URL construction error:', urlError)
      // Fallback to simple redirect
      return NextResponse.redirect(`https://houseranker.vercel.app${redirectUrl}`, 302)
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
      let title = lines[0].trim()
      // Filter out common sharing phrases from title too
      title = title.replace(/Check out this Compass listing\.?/gi, '').trim()
      result.title = title
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
    
    // Use remaining text as description, but filter out common sharing phrases
    let description = combinedText
    description = description.replace(/Check out this Compass listing\.?/gi, '').trim()
    result.description = description
  }
  
  return result
}

function isRealEstateUrl(url: string): boolean {
  return /compass\.com|zillow\.com|redfin\.com|realtor\.com|trulia\.com/i.test(url)
}

async function extractPropertyData(url: string): Promise<{ imageUrl: string | null, details: any | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      return { imageUrl: null, details: null }
    }
    
    const html = await response.text()
    
    // Extract Open Graph image
    let imageUrl = null
    const ogImageMatch = html.match(/<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i)
    if (ogImageMatch) {
      imageUrl = ogImageMatch[1]
      
      // Convert relative URLs to absolute
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      } else if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url)
        imageUrl = urlObj.origin + imageUrl
      }
    }
    
    // Fallback: look for Twitter card image
    if (!imageUrl) {
      const twitterImageMatch = html.match(/<meta[^>]*name=["\']twitter:image["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i)
      if (twitterImageMatch) {
        imageUrl = twitterImageMatch[1]
        
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl
        } else if (imageUrl.startsWith('/')) {
          const urlObj = new URL(url)
          imageUrl = urlObj.origin + imageUrl
        }
      }
    }
    
    // Extract additional property details from the HTML
    const details: any = {}
    console.log('HTML length:', html.length, 'characters')
    
    // Try to extract structured data (JSON-LD)
    const jsonLdMatches = html.match(/<script[^>]*type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/gis)
    if (jsonLdMatches) {
      console.log('Found', jsonLdMatches.length, 'JSON-LD scripts')
      jsonLdMatches.forEach((match, index) => {
        try {
          const jsonContent = match.match(/<script[^>]*type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is)
          if (jsonContent) {
            const jsonData = JSON.parse(jsonContent[1])
            console.log(`JSON-LD ${index}:`, JSON.stringify(jsonData, null, 2))
            if (jsonData['@type'] === 'RealEstateListing' || jsonData.name || jsonData.description) {
              details.structuredData = jsonData
            }
          }
        } catch (e) {
          console.log(`JSON-LD ${index} parsing error:`, e)
        }
      })
    } else {
      console.log('No JSON-LD scripts found')
    }
    
    // Extract Open Graph description
    const ogDescMatch = html.match(/<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i)
    if (ogDescMatch) {
      console.log('Open Graph description found:', ogDescMatch[1])
      details.description = ogDescMatch[1]
    } else {
      console.log('No Open Graph description found')
    }
    
    // Extract all Open Graph meta tags for debugging
    const ogTags = html.match(/<meta[^>]*property=["\']og:[^"\']+["\'][^>]*>/gi)
    if (ogTags) {
      console.log('All Open Graph tags found:')
      ogTags.forEach(tag => console.log('  ', tag))
    }
    
    // Look for common property detail patterns in the HTML
    // Square footage
    const sqftMatch = html.match(/(\d{1,3}(?:,\d{3})*)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i)
    if (sqftMatch) {
      console.log('Square footage found:', sqftMatch[1])
      details.sqft = parseInt(sqftMatch[1].replace(/,/g, ''))
    } else {
      console.log('No square footage pattern found')
    }
    
    // Lot size
    const lotMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:acres?|ac)\b/i)
    if (lotMatch) {
      console.log('Lot size found:', lotMatch[1])
      details.lotSize = parseFloat(lotMatch[1])
    } else {
      console.log('No lot size pattern found')
    }
    
    // Year built
    const yearMatch = html.match(/(?:built|year)\s*(?:in\s*)?(\d{4})/i)
    if (yearMatch) {
      console.log('Year built found:', yearMatch[1])
      details.yearBuilt = parseInt(yearMatch[1])
    } else {
      console.log('No year built pattern found')
    }
    
    const result = { 
      imageUrl, 
      details: Object.keys(details).length > 0 ? details : null 
    }
    
    console.log('Final extraction result:', JSON.stringify(result, null, 2))
    return result
    
  } catch (error) {
    console.log('Property data extraction failed:', error)
    return { imageUrl: null, details: null }
  }
}