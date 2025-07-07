# Import Feature Documentation

The House Ranker app supports importing house listings from multiple sources to quickly populate your ranking list.

## Import Methods

### 1. CSV File Import

Import houses from a CSV (Comma-Separated Values) file.

**Supported Columns:**
- `address` (required) - Street address of the property
- `title` - Custom title for the listing
- `description` - Property description
- `price` - Listing price (numbers only, currency symbols will be stripped)
- `image_url` - URL to property image (multiple URLs can be separated by commas or semicolons)
- `listing_url` - Link to original listing

**Example CSV:**
```csv
address,title,description,price,image_url
"123 Main St, City, ST",Beautiful Home,Great location,450000,https://example.com/image.jpg
"456 Oak Ave, City, ST",Cozy Condo,Downtown living,325000,https://example.com/image2.jpg
```

**Features:**
- Automatic title/description generation if missing
- Address-based deduplication
- Price parsing with currency symbol removal
- Multiple image handling (first image selected)

### 2. URL Import

Import a single property from a real estate website URL.

**Supported Sites:**
- Compass (compass.com)
- Zillow (zillow.com) 
- Redfin (redfin.com)
- Generic real estate sites

**Features:**
- Automatic data extraction from listing pages
- Image extraction from property photos
- Title and description parsing from page content
- Address detection from structured data

## Import Process

1. **Choose Import Method**: Select CSV file or URL import
2. **Configure Options**: Set column mappings (CSV) or extraction preferences (URL)
3. **Set Import Settings**:
   - Deduplicate by address
   - Auto-generate missing titles/descriptions
   - Select first image only
4. **Review and Import**: Process the import and review results

## Deduplication

Houses are deduplicated based on normalized addresses:

- Street types are standardized (Street → St, Avenue → Ave)
- Apartment/unit numbers are ignored for matching
- Case and extra whitespace are ignored
- House numbers and street names must match exactly

**Examples of duplicate detection:**
- "123 Main Street" = "123 Main St" 
- "123 Main St Apt 4B" = "123 Main Street"
- "456 Oak Avenue" = "456 Oak Ave"

## Data Processing

### Title Generation
If no title is provided, the app generates one using:
- Bedroom/bathroom count (if available)
- Street address (first part before comma)
- Property type (if available)

**Example:** "3BR/2BA - 123 Main St - Condo"

### Description Generation  
If no description is provided, the app generates one using:
- Square footage
- Year built
- Listing price
- Full address
- Listing URL

**Example:** "Imported property: 1,500 sq ft • Built in 2010 • Listed at $450,000 • Located at 123 Main St, City, ST"

### Image Selection
- For multiple images, only the first valid image URL is kept
- Images with "logo" or "icon" in the URL are filtered out
- Invalid URLs are removed

## CSV Format Tips

1. **Use quotes for addresses with commas:**
   ```csv
   "123 Main St, Apt 4B, City, ST"
   ```

2. **Multiple images (first will be selected):**
   ```csv
   "https://img1.jpg,https://img2.jpg;https://img3.jpg"
   ```

3. **Handle prices with currency symbols:**
   ```csv
   "$450,000" or "450000" both work
   ```

4. **Column names are case-sensitive and must match exactly**

## Troubleshooting

### Common CSV Issues
- **"Required address column not found"**: Check column name spelling
- **"Missing address"**: Ensure address column has data for all rows
- **Parse errors**: Check for unmatched quotes or malformed CSV

### URL Import Issues
- **"Failed to fetch URL"**: Check if URL is accessible and valid
- **"Could not extract address"**: URL may not contain structured property data
- **Timeout errors**: Website may be blocking automated requests

### Database Issues
- **"Failed to save to database"**: Check Supabase connection
- **Duplicate key errors**: Address deduplication may have failed

## Best Practices

1. **Test with small CSV files first** (5-10 properties)
2. **Use consistent address formats** in your CSV
3. **Include image URLs for better visual ranking**
4. **Verify URLs are publicly accessible** before importing
5. **Enable deduplication** to avoid duplicate entries
6. **Review import results** before proceeding to ranking

## Sample Data

A sample CSV file (`sample-houses.csv`) is included with the project for testing the import functionality.

## API Usage

For programmatic access, the import functionality is available via REST API:

```bash
# CSV Import
curl -X POST /api/import \
  -H "x-api-key: your-api-key" \
  -F "importType=csv" \
  -F "file=@houses.csv" \
  -F "config={\"deduplicateByAddress\":true}" \
  -F "csvConfig={\"addressColumn\":\"address\"}"

# URL Import  
curl -X POST /api/import \
  -H "x-api-key: your-api-key" \
  -F "importType=url" \
  -F "urlConfig={\"url\":\"https://...\",\"extractImages\":true}" \
  -F "config={\"deduplicateByAddress\":true}"
```

The API returns import results including success count, duplicates, and any errors encountered.