import { ImportedProperty, ImportResult, CSVImportConfig } from '@/types/import'
import { addressesMatch, generatePropertyTitle, generatePropertyDescription } from './address-utils'

export class CSVImporter {
  private config: CSVImportConfig
  
  constructor(config: CSVImportConfig) {
    this.config = config
  }
  
  async importFromCSV(csvContent: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      duplicates: 0,
      errors: [],
      houses: []
    }
    
    try {
      const rows = this.parseCSV(csvContent)
      
      if (rows.length === 0) {
        result.errors.push('CSV file is empty')
        return result
      }
      
      const headers = rows[0]
      const dataRows = rows.slice(1)
      
      // Validate required columns
      if (!headers.includes(this.config.addressColumn)) {
        result.errors.push(`Required address column '${this.config.addressColumn}' not found`)
        return result
      }
      
      const properties: ImportedProperty[] = []
      const seenAddresses = new Set<string>()
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        
        try {
          const property = this.parseRow(headers, row)
          
          if (!property.address) {
            result.errors.push(`Row ${i + 2}: Missing address`)
            continue
          }
          
          // Check for duplicates
          const isDuplicate = properties.some(existing => 
            addressesMatch(existing.address, property.address)
          )
          
          if (isDuplicate) {
            result.duplicates++
            continue
          }
          
          // Generate title and description if needed
          if (!property.title) {
            property.title = generatePropertyTitle(property)
          }
          
          if (!property.description) {
            property.description = generatePropertyDescription(property)
          }
          
          // Use first image if multiple provided
          if (property.images && property.images.length > 0) {
            property.images = [property.images[0]]
          }
          
          properties.push(property)
          result.imported++
          
        } catch (error) {
          result.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Parse error'}`)
        }
      }
      
      result.houses = properties
      result.success = result.imported > 0
      
    } catch (error) {
      result.errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return result
  }
  
  private parseCSV(content: string): string[][] {
    const rows: string[][] = []
    const lines = content.split('\n')
    
    for (const line of lines) {
      if (line.trim()) {
        // Simple CSV parsing - handles quoted fields
        const fields = this.parseCSVLine(line)
        rows.push(fields)
      }
    }
    
    return rows
  }
  
  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }
  
  private parseRow(headers: string[], row: string[]): ImportedProperty {
    const getField = (columnName?: string): string | undefined => {
      if (!columnName) return undefined
      const index = headers.indexOf(columnName)
      return index >= 0 ? row[index]?.trim() : undefined
    }
    
    const getNumberField = (columnName?: string): number | undefined => {
      const value = getField(columnName)
      if (!value) return undefined
      const num = parseFloat(value.replace(/[,$]/g, ''))
      return isNaN(num) ? undefined : num
    }
    
    const getImageArray = (columnName?: string): string[] | undefined => {
      const value = getField(columnName)
      if (!value) return undefined
      // Split by semicolon or comma and filter out empty strings
      return value.split(/[;,]/).map(url => url.trim()).filter(url => url.length > 0)
    }
    
    const address = getField(this.config.addressColumn)
    if (!address) {
      throw new Error('Address is required')
    }
    
    return {
      address,
      title: getField(this.config.titleColumn),
      description: getField(this.config.descriptionColumn),
      price: getNumberField(this.config.priceColumn),
      images: getImageArray(this.config.imageUrlColumn),
      listingUrl: getField(this.config.listingUrlColumn),
      source: 'csv'
    }
  }
}