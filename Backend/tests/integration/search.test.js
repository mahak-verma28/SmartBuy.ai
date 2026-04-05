const request = require('supertest');
const express = require('express');
const searchRouter = require('../../routes/search');
const Product = require('../../../DataBase/models/Product');
const PriceHistory = require('../../../DataBase/models/PriceHistory');

// Setup a mini app for testing the router
const app = express();
app.use(express.json());
app.use('/api/search', searchRouter);

// Mock the components
jest.mock('../../utils/scraper');
jest.mock('../../services/recommendationEngine');
jest.mock('../../../DataBase/models/Product');
jest.mock('../../../DataBase/models/PriceHistory');

const { scrapeAllPlatforms } = require('../../utils/scraper');
const { getRecommendation } = require('../../services/recommendationEngine');

describe('Search Route — Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for recommendation engine to prevent 500 errors in buildPayload
    getRecommendation.mockResolvedValue({
      signal: 'neutral',
      confidence: 50,
      reasoning: 'Testing...',
      factors: [],
      historyPoints: []
    });

    // Default mock for Product.findOne to avoid 500s from undefined property access
    Product.findOne.mockResolvedValue(null);

    // Default mock for scraper to prevent background job crashes
    scrapeAllPlatforms.mockResolvedValue({
      amazon: { price: 100, url: '' },
      flipkart: { price: 100, url: '' },
      myntra: { price: 100, url: '' },
      ajio: { price: 100, url: '' },
      meesho: { price: 100, url: '' }
    });
  });

  afterAll(() => {
    // Stop the cleanup interval so Jest can exit cleanly
    if (searchRouter._cleanupInterval) {
      clearInterval(searchRouter._cleanupInterval);
    }
  });

  test('TC-01: Fresh Search Query (Returns JobID)', async () => {
    // Force a cache miss
    Product.findOne.mockResolvedValue(null);

    const res = await request(app).get('/api/search?q=iphone 15');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.jobId).toBeDefined();
  });

  test('TC-02: Cached Search Query (Returns Payload)', async () => {
    // Mock Product.findOne to return a valid product (cached)
    const mockProduct = {
      query: 'iphone 15',
      results: [
        { store: 'Amazon', price: 60000, url: '...' }
      ],
      bestPrice: 60000,
      lowestStore: 'Amazon',
      cachedAt: new Date(),
      toObject: jest.fn().mockReturnValue({
         query: 'iphone 15', results: [{ store: 'Amazon', price: 60000, url: '...' }], bestPrice: 60000
      })
    };

    // Mongoose findOne is awaited, so mockResolvedValue works for the "cached" check
    Product.findOne.mockResolvedValue(mockProduct);
    
    // Mock Rec Engine for the payload builder
    getRecommendation.mockResolvedValue({
      signal: 'buy',
      confidence: 85,
      reasoning: 'Cached deal looks good',
      factors: ['Cached Data'],
      historyPoints: []
    });

    const res = await request(app).get('/api/search?q=iphone 15');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cached');
    expect(res.body.payload.title).toBe('iphone 15');
    expect(res.body.payload.currentBestPrice).toBe(60000);
  });

  test('TC-03: Empty Query Error', async () => {
    const res = await request(app).get('/api/search?q=');
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Query parameter "q" is required');
  });
});
