const { getRecommendation } = require('../../services/recommendationEngine');
const PriceHistory = require('../../../DataBase/models/PriceHistory');

// Mock PriceHistory
jest.mock('../../../DataBase/models/PriceHistory');

describe('Recommendation Engine — Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-01: BUY Signal for High Discount (>25%)', async () => {
    // History: High = 10000
    // Live: Lowest = 6500 (35% discount)
    PriceHistory.getHistory.mockResolvedValue([
      { price: 10000, recordedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { price: 9800,  recordedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
      { price: 9500,  recordedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { price: 9200,  recordedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { price: 9000,  recordedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    ]);

    const livePrices = {
      amazon: { price: 6500, url: 'http://amazon.in' },
      flipkart: { price: 6800, url: 'http://flipkart.com' }
    };

    const result = await getRecommendation('iphone 15', livePrices);

    expect(result.signal).toBe('buy');
    expect(result.confidence).toBeGreaterThan(75);
    expect(result.reasoning).toContain('34% below');
  });

  test('TC-02: WAIT Signal for Low Discount (<10%)', async () => {
    // Stable High ~ 10000
    // Live: Lowest = 9800 (only 2% discount)
    PriceHistory.getHistory.mockResolvedValue([
      { price: 10000, recordedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { price: 10100, recordedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
      { price: 9900,  recordedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { price: 10200, recordedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { price: 10000, recordedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    ]);

    const livePrices = {
      amazon: { price: 9800, url: 'http://amazon.in' }
    };

    const result = await getRecommendation('iphone 15', livePrices);

    expect(result.signal).toBe('wait');
    expect(result.reasoning).toContain('wait');
  });

  test('TC-03: TREND detection boost (Downward trend)', async () => {
    // Early: 10000, Recent: 8500 -> Trending Down
    // Current price is also 8000
    PriceHistory.getHistory.mockResolvedValue([
      { price: 10000, recordedAt: new Date('2024-01-01') },
      { price: 10100, recordedAt: new Date('2024-01-02') },
      { price: 9000,  recordedAt: new Date('2024-01-10') },
      { price: 8800,  recordedAt: new Date('2024-01-11') },
      { price: 8500,  recordedAt: new Date('2024-01-12') },
      { price: 8400,  recordedAt: new Date('2024-01-13') },
      { price: 8300,  recordedAt: new Date('2024-01-14') },
      { price: 8200,  recordedAt: new Date('2024-01-15') },
      { price: 8100,  recordedAt: new Date('2024-01-16') },
      { price: 8000,  recordedAt: new Date('2024-01-17') },
    ]);

    const livePrices = { amazon: { price: 7500, url: '...' } };

    const result = await getRecommendation('iphone 15', livePrices);
    
    expect(result.signal).toBe('buy');
    expect(result.factors).toContain('Market trend: ON A DOWNWARD TREND');
  });

  test('TC-04: NEUTRAL for first search (No history)', async () => {
    PriceHistory.getHistory.mockResolvedValue([]);

    const livePrices = { amazon: { price: 50000, url: '...' } };

    const result = await getRecommendation('iphone 15', livePrices);

    expect(result.signal).toBe('neutral');
    expect(result.reasoning).toContain('Tracking phase initiated');
  });
});
