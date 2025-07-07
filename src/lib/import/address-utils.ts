export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    // Remove common prefixes/suffixes
    .replace(/\b(apt|apartment|unit|suite|ste)\s*\w*$/i, '')
    .replace(/#\s*\w*$/i, '')
    // Normalize street types
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bcircle\b/g, 'cir')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

export function addressesMatch(address1: string, address2: string): boolean {
  const normalized1 = normalizeAddress(address1)
  const normalized2 = normalizeAddress(address2)
  
  // Exact match after normalization
  if (normalized1 === normalized2) {
    return true
  }
  
  // Fuzzy match - check if core parts match
  const parts1 = normalized1.split(' ')
  const parts2 = normalized2.split(' ')
  
  // Extract house number and street name (first few words)
  if (parts1.length >= 2 && parts2.length >= 2) {
    const houseNumber1 = parts1[0]
    const houseNumber2 = parts2[0]
    
    // House numbers must match
    if (houseNumber1 !== houseNumber2) {
      return false
    }
    
    // Check if street names are similar
    const streetName1 = parts1.slice(1, 3).join(' ')
    const streetName2 = parts2.slice(1, 3).join(' ')
    
    return streetName1 === streetName2
  }
  
  return false
}

export function generatePropertyTitle(property: any): string {
  const parts = []
  
  if (property.bedrooms && property.bathrooms) {
    parts.push(`${property.bedrooms}BR/${property.bathrooms}BA`)
  }
  
  if (property.address) {
    // Extract just the street address part
    const addressParts = property.address.split(',')
    if (addressParts.length > 0) {
      parts.push(addressParts[0].trim())
    }
  }
  
  if (property.propertyType) {
    parts.push(property.propertyType)
  }
  
  return parts.length > 0 ? parts.join(' - ') : 'Imported Property'
}

export function generatePropertyDescription(property: any): string {
  const details = []
  
  if (property.squareFootage) {
    details.push(`${property.squareFootage.toLocaleString()} sq ft`)
  }
  
  if (property.yearBuilt) {
    details.push(`Built in ${property.yearBuilt}`)
  }
  
  if (property.price) {
    details.push(`Listed at $${property.price.toLocaleString()}`)
  }
  
  if (property.address) {
    details.push(`Located at ${property.address}`)
  }
  
  if (property.listingUrl) {
    details.push(`View listing: ${property.listingUrl}`)
  }
  
  return details.length > 0 
    ? `Imported property: ${details.join(' • ')}`
    : 'Imported property from external source'
}