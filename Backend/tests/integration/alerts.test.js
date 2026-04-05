const request = require('supertest');
const express = require('express');
const alertRouter = require('../../routes/alerts');
const Alert = require('../../../DataBase/models/Alert');

// Mock User Model and Auth Middleware
jest.mock('../../../DataBase/models/Alert');
jest.mock('../../middleware/auth', () => ({
    protect: (req, res, next) => {
        req.user = { userId: 'mock-123', _id: 'mock-123' }; // Simulate logged in user
        next();
    }
}));

const app = express();
app.use(express.json());
app.use('/api/alerts', alertRouter);

describe('Alerts Route — Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('TC-01: Create Alert (Success)', async () => {
        // Mock Alert.findOneAndUpdate (Since routes/alerts.js uses upsert)
        Alert.findOneAndUpdate.mockResolvedValue({
            userId: 'mock-123',
            query: 'iphone 15',
            targetPrice: 70000,
            currentPrice: 75000
        });

        const res = await request(app)
            .post('/api/alerts')
            .send({ 
                query: 'iphone 15', 
                targetPrice: 70000, 
                currentPrice: 75000 
            });

        expect(res.status).toBe(201);
        expect(res.body.query).toBe('iphone 15');
    });

    test('TC-02: Get User Alerts (Success)', async () => {
        Alert.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue([
                { query: 'iphone 15', targetPrice: 70000 }
            ])
        });

        const res = await request(app).get('/api/alerts/');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].query).toBe('iphone 15');
    });

    test('TC-03: Empty Data Validation (Error)', async () => {
        const res = await request(app)
            .post('/api/alerts')
            .send({ query: '' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBeDefined();
    });
});
