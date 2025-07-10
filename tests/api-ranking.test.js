// API endpoint tests for ranking functionality
// Run with: npm test tests/api-ranking.test.js

const request = require('supertest')
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

describe('Ranking API Tests', () => {
  let server
  let testApiKey = 'test-api-key'
  let testUserId = 'test-user-' + Date.now()

  beforeAll(async () => {
    await app.prepare()
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true)
      handle(req, res, parsedUrl)
    })
    server.listen(3001)
  })

  afterAll(() => {
    server.close()
  })

  test('GET /api/houses should return ranked houses with ranking info', async () => {
    const response = await request(server)
      .get('/api/houses')
      .query({
        ranked: 'true',
        collection_name: 'Test Collection',
        ranking_name: 'Main Ranking'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    
    // Check that returned houses have ranking info
    if (response.body.length > 0) {
      const house = response.body[0]
      expect(house).toHaveProperty('rank')
      expect(house).toHaveProperty('ranking_name')
    }
  })

  test('GET /api/houses should return unranked houses without ranking filter', async () => {
    const response = await request(server)
      .get('/api/houses')
      .query({
        ranked: 'false',
        collection_name: 'Test Collection'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })

  test('GET /api/collections should return distinct collections and rankings', async () => {
    const response = await request(server)
      .get('/api/collections')
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('collections')
    expect(response.body).toHaveProperty('rankings')
    expect(Array.isArray(response.body.collections)).toBe(true)
    expect(Array.isArray(response.body.rankings)).toBe(true)
  })

  test('POST /api/ranking should create ranking and update existing ranks', async () => {
    // First create some test houses
    const houseResponse1 = await request(server)
      .post('/api/houses')
      .send({
        title: 'Test House 1',
        description: 'Test description 1',
        collection_name: 'API Test Collection'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    const houseResponse2 = await request(server)
      .post('/api/houses')
      .send({
        title: 'Test House 2', 
        description: 'Test description 2',
        collection_name: 'API Test Collection'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    expect(houseResponse1.status).toBe(201)
    expect(houseResponse2.status).toBe(201)

    const house1Id = houseResponse1.body.id
    const house2Id = houseResponse2.body.id

    // Rank the first house (should be rank 0)
    const rankingResponse1 = await request(server)
      .post('/api/ranking')
      .send({
        houseId: house1Id,
        comparisons: [],
        rankingName: 'API Test Ranking'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    expect(rankingResponse1.status).toBe(200)
    expect(rankingResponse1.body.finalRank).toBe(0)

    // Rank the second house (should trigger rank updates)
    const rankingResponse2 = await request(server)
      .post('/api/ranking')
      .send({
        houseId: house2Id,
        comparisons: [
          { houseId: house1Id, rank: 0, isHigher: false } // Second house is better
        ],
        rankingName: 'API Test Ranking'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    expect(rankingResponse2.status).toBe(200)
    expect(rankingResponse2.body.finalRank).toBe(0) // Should be ranked #1

    // Verify the rankings were created correctly
    const rankedHouses = await request(server)
      .get('/api/houses')
      .query({
        ranked: 'true',
        collection_name: 'API Test Collection',
        ranking_name: 'API Test Ranking'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    expect(rankedHouses.status).toBe(200)
    expect(rankedHouses.body).toHaveLength(2)
    
    // Check ranking order
    const sortedHouses = rankedHouses.body.sort((a, b) => a.rank - b.rank)
    expect(sortedHouses[0].id).toBe(house2Id) // House 2 should be rank 0
    expect(sortedHouses[1].id).toBe(house1Id) // House 1 should be rank 1
  })

  test('API should handle multiple rankings for same collection', async () => {
    // Create a test house
    const houseResponse = await request(server)
      .post('/api/houses')
      .send({
        title: 'Multi Ranking Test House',
        description: 'Test house for multiple rankings',
        collection_name: 'Multi Ranking Collection'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    const houseId = houseResponse.body.id

    // Rank in first ranking
    const ranking1Response = await request(server)
      .post('/api/ranking')
      .send({
        houseId: houseId,
        comparisons: [],
        rankingName: 'Primary Ranking'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    expect(ranking1Response.status).toBe(200)

    // Rank in second ranking
    const ranking2Response = await request(server)
      .post('/api/ranking')
      .send({
        houseId: houseId,
        comparisons: [],
        rankingName: 'Secondary Ranking'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    expect(ranking2Response.status).toBe(200)

    // Verify both rankings exist
    const primaryRanked = await request(server)
      .get('/api/houses')
      .query({
        ranked: 'true',
        collection_name: 'Multi Ranking Collection',
        ranking_name: 'Primary Ranking'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    const secondaryRanked = await request(server)
      .get('/api/houses')
      .query({
        ranked: 'true',
        collection_name: 'Multi Ranking Collection',
        ranking_name: 'Secondary Ranking'
      })
      .set('x-api-key', testApiKey)
      .set('x-user-id', testUserId)

    expect(primaryRanked.status).toBe(200)
    expect(secondaryRanked.status).toBe(200)
    expect(primaryRanked.body).toHaveLength(1)
    expect(secondaryRanked.body).toHaveLength(1)
    
    // Both should reference the same house but potentially different ranks
    expect(primaryRanked.body[0].id).toBe(houseId)
    expect(secondaryRanked.body[0].id).toBe(houseId)
  })

  test('API should return 401 without valid API key', async () => {
    const response = await request(server)
      .get('/api/houses')
      .set('x-user-id', testUserId)

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('Unauthorized')
  })
})