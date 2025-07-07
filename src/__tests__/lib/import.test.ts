import { CSVImporter } from '@/lib/import/csv-importer'
import { addressesMatch, normalizeAddress, generatePropertyTitle, generatePropertyDescription } from '@/lib/import/address-utils'
import { CSVImportConfig } from '@/types/import'

describe('Import Functionality', () => {
  describe('Address utilities', () => {
    describe('normalizeAddress', () => {
      it('should normalize street types', () => {
        expect(normalizeAddress('123 Main Street')).toBe('123 main st')
        expect(normalizeAddress('456 Oak Avenue')).toBe('456 oak ave')
        expect(normalizeAddress('789 First Boulevard')).toBe('789 first blvd')
      })

      it('should remove apartment info', () => {
        expect(normalizeAddress('123 Main St Apt 4B')).toBe('123 main st')
        expect(normalizeAddress('456 Oak Ave Unit 202')).toBe('456 oak ave')
        expect(normalizeAddress('789 First Blvd #301')).toBe('789 first blvd')
      })

      it('should handle extra whitespace', () => {
        expect(normalizeAddress('  123   Main    Street  ')).toBe('123 main st')
      })
    })

    describe('addressesMatch', () => {
      it('should match identical addresses', () => {
        expect(addressesMatch('123 Main St', '123 Main Street')).toBe(true)
        expect(addressesMatch('456 Oak Avenue', '456 Oak Ave')).toBe(true)
      })

      it('should match despite apartment differences', () => {
        expect(addressesMatch('123 Main St', '123 Main St Apt 4B')).toBe(true)
        expect(addressesMatch('456 Oak Ave Unit 202', '456 Oak Avenue')).toBe(true)
      })

      it('should not match different addresses', () => {
        expect(addressesMatch('123 Main St', '124 Main St')).toBe(false)
        expect(addressesMatch('123 Main St', '123 Oak St')).toBe(false)
      })
    })

    describe('generatePropertyTitle', () => {
      it('should generate title with bedroom/bathroom info', () => {
        const property = {
          bedrooms: 3,
          bathrooms: 2,
          address: '123 Main St, City, ST 12345'
        }
        const title = generatePropertyTitle(property)
        expect(title).toBe('3BR/2BA - 123 Main St')
      })

      it('should handle missing bedroom/bathroom info', () => {
        const property = {
          address: '123 Main St, City, ST 12345',
          propertyType: 'Condo'
        }
        const title = generatePropertyTitle(property)
        expect(title).toBe('123 Main St - Condo')
      })

      it('should handle minimal info', () => {
        const property = {}
        const title = generatePropertyTitle(property)
        expect(title).toBe('Imported Property')
      })
    })

    describe('generatePropertyDescription', () => {
      it('should generate comprehensive description', () => {
        const property = {
          squareFootage: 1500,
          yearBuilt: 2010,
          price: 450000,
          address: '123 Main St, City, ST 12345',
          listingUrl: 'https://example.com/listing'
        }
        const description = generatePropertyDescription(property)
        expect(description).toContain('1,500 sq ft')
        expect(description).toContain('Built in 2010')
        expect(description).toContain('$450,000')
        expect(description).toContain('123 Main St, City, ST 12345')
        expect(description).toContain('https://example.com/listing')
      })

      it('should handle minimal info', () => {
        const property = {}
        const description = generatePropertyDescription(property)
        expect(description).toBe('Imported property from external source')
      })
    })
  })

  describe('CSV Importer', () => {
    const csvConfig: CSVImportConfig = {
      addressColumn: 'address',
      titleColumn: 'title',
      descriptionColumn: 'description',
      priceColumn: 'price',
      imageUrlColumn: 'image_url'
    }

    it('should parse simple CSV correctly', async () => {
      const csvContent = `address,title,description,price,image_url
123 Main St,Beautiful Home,Great location,450000,https://example.com/image1.jpg
456 Oak Ave,Cozy Condo,Downtown living,325000,https://example.com/image2.jpg`

      const importer = new CSVImporter(csvConfig)
      const result = await importer.importFromCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(result.houses).toHaveLength(2)
      expect(result.houses[0].address).toBe('123 Main St')
      expect(result.houses[0].title).toBe('Beautiful Home')
      expect(result.houses[0].price).toBe(450000)
    })

    it('should handle CSV with quotes', async () => {
      const csvContent = `address,title,description
"123 Main St, Apt 4B","Beautiful Home","Great location, close to schools"
456 Oak Ave,Cozy Condo,Downtown living`

      const importer = new CSVImporter(csvConfig)
      const result = await importer.importFromCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(result.houses[0].address).toBe('123 Main St, Apt 4B')
      expect(result.houses[0].description).toBe('Great location, close to schools')
    })

    it('should generate titles and descriptions when missing', async () => {
      const csvContent = `address,price
123 Main St,450000`

      const importer = new CSVImporter(csvConfig)
      const result = await importer.importFromCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.houses[0].title).toBeDefined()
      expect(result.houses[0].description).toBeDefined()
      expect(result.houses[0].title).not.toBe('')
      expect(result.houses[0].description).not.toBe('')
    })

    it('should deduplicate by address', async () => {
      const csvContent = `address,title
123 Main St,House 1
123 Main Street,House 2
456 Oak Ave,House 3`

      const importer = new CSVImporter(csvConfig)
      const result = await importer.importFromCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(2) // One duplicate removed
      expect(result.duplicates).toBe(1)
    })

    it('should handle missing address column', async () => {
      const csvContent = `title,description
Beautiful Home,Great location`

      const importer = new CSVImporter(csvConfig)
      const result = await importer.importFromCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain("Required address column 'address' not found")
    })

    it('should handle empty CSV', async () => {
      const csvContent = ''

      const importer = new CSVImporter(csvConfig)
      const result = await importer.importFromCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('CSV file is empty')
    })

    it('should parse price with currency symbols', async () => {
      const csvContent = `address,price
123 Main St,"$450,000"
456 Oak Ave,$325000`

      const importer = new CSVImporter(csvConfig)
      const result = await importer.importFromCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.houses[0].price).toBe(450000)
      expect(result.houses[1].price).toBe(325000)
    })

    it('should handle multiple images', async () => {
      const csvContent = `address,image_url
123 Main St,"https://example.com/1.jpg,https://example.com/2.jpg;https://example.com/3.jpg"`

      const importer = new CSVImporter(csvConfig)
      const result = await importer.importFromCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.houses[0].images).toHaveLength(1) // Should only keep first image
      expect(result.houses[0].images![0]).toBe('https://example.com/1.jpg')
    })
  })
})