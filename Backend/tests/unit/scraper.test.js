const { isTitleMatch } = require('../../utils/scraper');

describe('Scraper Accuracy — Unit Tests', () => {
    
    describe('isTitleMatch — Fuzzy Matching Logic', () => {
        
        test('Match: "mac m1" vs "Apple MacBook Air M1 Laptop"', () => {
            const query = "mac m1";
            const title = "Apple MacBook Air M1 - (8 GB/256 GB SSD/macOS Big Sur) MGN63HN/A";
            expect(isTitleMatch(query, title)).toBe(true);
        });

        test('Match: "iphone 14" vs "Apple iPhone 14 (Blue, 128 GB)"', () => {
            const query = "iphone 14";
            const title = "Apple iPhone 14 (Blue, 128 GB)";
            expect(isTitleMatch(query, title)).toBe(true);
        });

        test('Exclusion: "iphone 15" vs "iPhone 15 Pro Max Clear Case"', () => {
            const query = "iphone 15";
            const title = "Apple iPhone 15 Pro Max Clear Case with MagSafe";
            expect(isTitleMatch(query, title)).toBe(false);
        });

        test('Exclusion: "macbook" vs "MacBook Air Charger 30W"', () => {
            const query = "macbook";
            const title = "USB-C Power Adapter MacBook Air Charger 30W";
            expect(isTitleMatch(query, title)).toBe(false);
        });

        test('Anchor Requirement: "iphone 15" vs "iPhone 14"', () => {
            // Should fail because anchor '15' is missing
            const query = "iphone 15";
            const title = "Apple iPhone 14 (Blue, 128 GB)";
            expect(isTitleMatch(query, title)).toBe(false);
        });

        test('Substring Match: "mac" in "MacBook"', () => {
            const query = "mac";
            const title = "MacBook Pro M3";
            expect(isTitleMatch(query, title)).toBe(true);
        });
    });
});
