import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateApiKey } from '@/lib/auth'
import { CSVImporter } from '@/lib/import/csv-importer'
import { URLImporter } from '@/lib/import/url-importer'
import { addressesMatch } from '@/lib/import/address-utils'
import { ImportConfig, ImportResult } from '@/types/import'

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userId = request.headers.get('x-user-id') || 'default'
    const formData = await request.formData()
    
    const importType = formData.get('importType') as string
    const configJson = formData.get('config') as string
    
    if (!importType || !configJson) {
      return NextResponse.json({ error: 'Import type and config are required' }, { status: 400 })
    }

    const config: ImportConfig = JSON.parse(configJson)
    let importResult: ImportResult

    switch (importType) {
      case 'csv':
        const csvFile = formData.get('file') as File
        if (!csvFile) {
          return NextResponse.json({ error: 'CSV file is required' }, { status: 400 })
        }
        const csvContent = await csvFile.text()
        const csvConfig = JSON.parse(formData.get('csvConfig') as string)
        const csvImporter = new CSVImporter(csvConfig)
        importResult = await csvImporter.importFromCSV(csvContent)
        break

      case 'url':
        const urlConfig = JSON.parse(formData.get('urlConfig') as string)
        const urlImporter = new URLImporter(urlConfig)
        importResult = await urlImporter.importFromURL()
        break

      default:
        return NextResponse.json({ error: 'Unsupported import type' }, { status: 400 })
    }

    if (!importResult.success) {
      return NextResponse.json({
        success: false,
        errors: importResult.errors,
        imported: 0,
        duplicates: 0
      })
    }

    // Check for duplicates against existing houses if deduplication is enabled
    if (config.deduplicateByAddress) {
      const { data: existingHouses } = await supabase
        .from('houses')
        .select('title, description')
        .eq('user_id', userId)

      if (existingHouses) {
        importResult.houses = importResult.houses.filter(importedHouse => {
          const isDuplicate = existingHouses.some(existing => 
            addressesMatch(existing.title || '', importedHouse.address)
          )
          if (isDuplicate) {
            importResult.duplicates++
            importResult.imported--
          }
          return !isDuplicate
        })
      }
    }

    // Insert the imported houses into the database
    const housesToInsert = importResult.houses.map(house => ({
      title: house.title || house.address,
      description: house.description || `Imported from ${house.source}`,
      image_url: house.images?.[0] || null,
      user_id: userId,
      is_ranked: false
    }))

    if (housesToInsert.length > 0) {
      const { data: insertedHouses, error } = await supabase
        .from('houses')
        .insert(housesToInsert)
        .select()

      if (error) {
        console.error('Database insert error:', error)
        return NextResponse.json({ 
          error: 'Failed to save imported houses to database',
          details: error.message 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        imported: insertedHouses?.length || 0,
        duplicates: importResult.duplicates,
        errors: importResult.errors,
        houses: insertedHouses
      })
    } else {
      return NextResponse.json({
        success: true,
        imported: 0,
        duplicates: importResult.duplicates,
        errors: importResult.errors.concat(['No new houses to import after deduplication']),
        houses: []
      })
    }

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: 'Import failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}