import { ImportedProperty, ImportResult, URLImportConfig } from '@/types/import'
import { generatePropertyTitle, generatePropertyDescription } from './address-utils'

export class URLImporter {
  private config: URLImportConfig
  
  constructor(config: URLImportConfig) {
    this.config = config
  }
  
  async importFromURL(): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      duplicates: 0,
      errors: [],
      houses: []
    }
    
    try {
      // Fetch the webpage content
      const response = await fetch(`/api/import/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: this.config.url,
          extractImages: this.config.extractImages,
          extractTitle: this.config.extractTitle,
          extractDescription: this.config.extractDescription
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`)
      }
      
      const scrapedData = await response.json()
      
      // Handle different URL types
      if (this.isCompassURL(this.config.url)) {
        return this.parseCompassListing(scrapedData, result)
      } else if (this.isZillowURL(this.config.url)) {
        return this.parseZillowListing(scrapedData, result)
      } else if (this.isRedfinURL(this.config.url)) {
        return this.parseRedfinListing(scrapedData, result)
      } else {
        return this.parseGenericListing(scrapedData, result)
      }
      
    } catch (error) {
      result.errors.push(`URL import error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }
  
  private isCompassURL(url: string): boolean {
    return url.includes('compass.com')
  }
  
  private isZillowURL(url: string): boolean {
    return url.includes('zillow.com')
  }
  
  private isRedfinURL(url: string): boolean {
    return url.includes('redfin.com')
  }
  
  private parseCompassListing(data: any, result: ImportResult): ImportResult {
    try {
      const property: ImportedProperty = {
        address: this.extractAddress(data, [
          'address',
          '[data-testid="property-address"]',
          '.address',
          'h1'
        ]),
        title: this.config.extractTitle ? this.extractTitle(data) : undefined,
        description: this.config.extractDescription ? this.extractDescription(data) : undefined,
        price: this.extractPrice(data, [
          '[data-testid="price"]',
          '.price',
          '.listing-price'
        ]),
        images: this.config.extractImages ? this.extractImages(data) : undefined,
        listingUrl: this.config.url,
        source: 'compass'
      }
      
      if (!property.address) {
        result.errors.push('Could not extract address from Compass listing')
        return result
      }
      
      // Auto-generate title and description
      if (!property.title) {
        property.title = generatePropertyTitle(property)
      }
      
      if (!property.description) {
        property.description = generatePropertyDescription(property)
      }
      
      // Use first image only
      if (property.images && property.images.length > 0) {
        property.images = [property.images[0]]
      }
      
      result.houses = [property]
      result.imported = 1
      result.success = true
      
    } catch (error) {
      result.errors.push(`Compass parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return result
  }
  
  private parseZillowListing(data: any, result: ImportResult): ImportResult {
    // Similar to Compass but with Zillow-specific selectors
    try {
      const property: ImportedProperty = {
        address: this.extractAddress(data, [
          '[data-testid="property-address"]',
          'h1[data-testid="bdp-building-name"]',
          '.ds-address-container'
        ]),
        title: this.config.extractTitle ? this.extractTitle(data) : undefined,
        description: this.config.extractDescription ? this.extractDescription(data) : undefined,
        price: this.extractPrice(data, [
          '[data-testid="price"]',
          '.notranslate'
        ]),
        images: this.config.extractImages ? this.extractImages(data) : undefined,
        listingUrl: this.config.url,
        source: 'url'
      }
      
      if (!property.address) {
        result.errors.push('Could not extract address from Zillow listing')
        return result
      }
      
      if (!property.title) {
        property.title = generatePropertyTitle(property)
      }
      
      if (!property.description) {
        property.description = generatePropertyDescription(property)
      }
      
      if (property.images && property.images.length > 0) {
        property.images = [property.images[0]]
      }
      
      result.houses = [property]
      result.imported = 1
      result.success = true
      
    } catch (error) {
      result.errors.push(`Zillow parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return result
  }
  
  private parseRedfinListing(data: any, result: ImportResult): ImportResult {
    // Redfin-specific parsing
    try {
      const property: ImportedProperty = {
        address: this.extractAddress(data, [
          '.street-address',
          '[data-rf-test-id="property-address"]'
        ]),
        title: this.config.extractTitle ? this.extractTitle(data) : undefined,
        description: this.config.extractDescription ? this.extractDescription(data) : undefined,
        images: this.config.extractImages ? this.extractImages(data) : undefined,
        listingUrl: this.config.url,
        source: 'url'
      }
      
      if (!property.address) {
        result.errors.push('Could not extract address from Redfin listing')
        return result
      }
      
      if (!property.title) {
        property.title = generatePropertyTitle(property)
      }
      
      if (!property.description) {
        property.description = generatePropertyDescription(property)
      }
      
      if (property.images && property.images.length > 0) {
        property.images = [property.images[0]]
      }
      
      result.houses = [property]
      result.imported = 1
      result.success = true
      
    } catch (error) {
      result.errors.push(`Redfin parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return result
  }
  
  private parseGenericListing(data: any, result: ImportResult): ImportResult {
    try {
      const property: ImportedProperty = {
        address: this.extractAddress(data, [
          '.address',
          '[itemprop="address"]',
          'h1',
          'title'
        ]),
        title: this.config.extractTitle ? this.extractTitle(data) : undefined,
        description: this.config.extractDescription ? this.extractDescription(data) : undefined,
        images: this.config.extractImages ? this.extractImages(data) : undefined,
        listingUrl: this.config.url,
        source: 'url'
      }
      
      if (!property.address) {
        result.errors.push('Could not extract address from listing')
        return result
      }
      
      if (!property.title) {
        property.title = generatePropertyTitle(property)
      }
      
      if (!property.description) {
        property.description = generatePropertyDescription(property)
      }
      
      if (property.images && property.images.length > 0) {
        property.images = [property.images[0]]
      }
      
      result.houses = [property]
      result.imported = 1
      result.success = true
      
    } catch (error) {
      result.errors.push(`Generic parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return result
  }
  
  private extractAddress(data: any, selectors: string[]): string {
    for (const selector of selectors) {
      const element = data.querySelector?.(selector)
      if (element?.textContent) {
        return element.textContent.trim()
      }
    }
    return ''
  }
  
  private extractTitle(data: any): string {
    const selectors = ['title', 'h1', '.property-title', '[data-testid="property-title"]']
    for (const selector of selectors) {
      const element = data.querySelector?.(selector)
      if (element?.textContent) {
        return element.textContent.trim()
      }
    }
    return ''
  }
  
  private extractDescription(data: any): string {
    const selectors = [
      '.property-description',
      '[data-testid="property-description"]',
      '.description',
      'meta[name="description"]'
    ]
    for (const selector of selectors) {
      const element = data.querySelector?.(selector)
      if (element?.textContent || element?.content) {
        return (element.textContent || element.content).trim()
      }
    }
    return ''
  }
  
  private extractPrice(data: any, selectors: string[]): number | undefined {
    for (const selector of selectors) {
      const element = data.querySelector?.(selector)
      if (element?.textContent) {
        const priceText = element.textContent.replace(/[^0-9]/g, '')
        const price = parseInt(priceText)
        if (!isNaN(price)) {
          return price
        }
      }
    }
    return undefined
  }
  
  private extractImages(data: any): string[] {
    const images: string[] = []
    const selectors = [
      'img[src*="photo"]',
      'img[src*="image"]',
      '.property-image img',
      '.listing-image img'
    ]
    
    for (const selector of selectors) {
      const elements = data.querySelectorAll?.(selector) || []
      for (const img of elements) {
        if (img.src && !img.src.includes('logo') && !img.src.includes('icon')) {
          images.push(img.src)
        }
      }
    }
    
    return images
  }
}