/**
 * Normalization Test Script
 * Tests the scoring normalization implementation
 * 
 * Run with: npx tsx scripts/test-normalization.ts
 */

import { 
  calculateScores,
  getScoreLabel,
  getScoreRelative,
  getGrade
} from '../src/lib/scoring';
import { DEFAULT_PREFERENCES, UserPreferences } from '../src/types/preferences';
import { CityWithMetrics } from '../src/types/city';

// Test result tracking
let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${name} - Error: ${e}`);
    failed++;
  }
}

function expect(actual: number) {
  return {
    toBeGreaterThan: (expected: number) => actual > expected,
    toBeLessThan: (expected: number) => actual < expected,
    toBe: (expected: any) => actual === expected,
    toBeCloseTo: (expected: number, delta: number = 5) => Math.abs(actual - expected) <= delta,
  };
}

// Mock city factory
const createMockCity = (
  id: string, 
  name: string, 
  state: string,
  overrides: any = {}
): CityWithMetrics => ({
  id,
  name,
  state,
  regionId: null,
  latitude: 0,
  longitude: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  metrics: {
    population: 1000000,
    diversityIndex: 50,
    medianAge: 35,
    medianHomePrice: 500000,
    walkScore: 70,
    transitScore: 50,
    crimeRate: 300,
    nflTeams: 0,
    nbaTeams: 0,
    mlbTeams: 0,
    nhlTeams: 0,
    ...overrides,
  } as CityWithMetrics['metrics'],
});

// San Diego-like climate (best in US)
const sanDiegoClimate = {
  noaa: {
    comfortDays: 254,
    extremeHeatDays: 1,
    freezeDays: 0,
    rainDays: 40,
    snowDays: 0,
    cloudyDays: 64,
    julyDewpoint: 61.5,
    coolingDegreeDays: 868,
    heatingDegreeDays: 1020,
    growingSeasonDays: 300,
    seasonalStability: 6,
    diurnalSwing: 12.2,
  },
};

// Minneapolis-like climate (harsh winters)
const minneapolisClimate = {
  noaa: {
    comfortDays: 84,
    extremeHeatDays: 2,
    freezeDays: 148,
    rainDays: 119,
    snowDays: 15,
    cloudyDays: 124,
    julyDewpoint: 60.6,
    coolingDegreeDays: 832,
    heatingDegreeDays: 7403,
    growingSeasonDays: 150,
    seasonalStability: 25,
    diurnalSwing: 17.4,
  },
};

console.log('\n========================================');
console.log('   NORMALIZATION TEST SUITE');
console.log('========================================\n');

// ============================================
// Score Interpretation Tests
// ============================================
console.log('--- Score Interpretation ---\n');

test('getScoreLabel: 95 = Exceptional', () => getScoreLabel(95) === 'Exceptional');
test('getScoreLabel: 80 = Above Average', () => getScoreLabel(80) === 'Above Average');
test('getScoreLabel: 50 = Average', () => getScoreLabel(50) === 'Average');
test('getScoreLabel: 30 = Below Average', () => getScoreLabel(30) === 'Below Average');
test('getScoreLabel: 15 = Poor', () => getScoreLabel(15) === 'Poor');

test('getScoreRelative: 75 shows +25 (green)', () => {
  const r = getScoreRelative(75);
  return r.text === '+25' && r.color.includes('green');
});

test('getScoreRelative: 25 shows -25 (red)', () => {
  const r = getScoreRelative(25);
  return r.text === '-25' && r.color.includes('red');
});

test('getScoreRelative: 50 shows avg', () => getScoreRelative(50).text === 'avg');
test('getScoreRelative: 52 shows avg (within 5)', () => getScoreRelative(52).text === 'avg');

// ============================================
// Climate Normalization Tests
// ============================================
console.log('\n--- Climate Normalization ---\n');

const climateOnlyPrefs: UserPreferences = {
  ...DEFAULT_PREFERENCES,
  weights: {
    climate: 100,
    costOfLiving: 0,
    demographics: 0,
    qualityOfLife: 0,
    cultural: 0,
  },
};

test('San Diego should score >85 on Climate (best weather)', () => {
  const sanDiego = createMockCity('sd', 'San Diego', 'CA', sanDiegoClimate);
  const result = calculateScores([sanDiego], climateOnlyPrefs);
  const score = result.rankings[0].climateScore;
  console.log(`   San Diego Climate: ${score.toFixed(1)}`);
  return expect(score).toBeGreaterThan(85);
});

test('Minneapolis should score 20-55 on Climate (harsh winters)', () => {
  const minneapolis = createMockCity('msp', 'Minneapolis', 'MN', minneapolisClimate);
  const result = calculateScores([minneapolis], climateOnlyPrefs);
  const score = result.rankings[0].climateScore;
  console.log(`   Minneapolis Climate: ${score.toFixed(1)}`);
  return expect(score).toBeGreaterThan(20) && expect(score).toBeLessThan(55);
});

test('Climate spread: SD vs Minneapolis should differ by >30 points', () => {
  const sanDiego = createMockCity('sd', 'San Diego', 'CA', sanDiegoClimate);
  const minneapolis = createMockCity('msp', 'Minneapolis', 'MN', minneapolisClimate);
  const result = calculateScores([sanDiego, minneapolis], climateOnlyPrefs);
  
  const sdScore = result.rankings.find(r => r.cityId === 'sd')!.climateScore;
  const mspScore = result.rankings.find(r => r.cityId === 'msp')!.climateScore;
  const spread = sdScore - mspScore;
  
  console.log(`   Climate Spread: ${spread.toFixed(1)} points`);
  return expect(spread).toBeGreaterThan(30);
});

// ============================================
// Demographics: Critical Mass Tests
// ============================================
console.log('\n--- Demographics: Critical Mass ---\n');

const demographicsOnlyPrefs: UserPreferences = {
  ...DEFAULT_PREFERENCES,
  weights: {
    climate: 0,
    costOfLiving: 0,
    demographics: 100,
    qualityOfLife: 0,
    cultural: 0,
  },
  advanced: {
    ...DEFAULT_PREFERENCES.advanced,
    demographics: {
      ...DEFAULT_PREFERENCES.advanced.demographics,
      minorityGroup: 'asian',
      minoritySubgroup: 'any',
      minMinorityPresence: 10,
      minorityImportance: 100,
      weightPopulationSize: 0,
      weightMedianAge: 0,
      weightForeignBorn: 0,
      weightEconomicHealth: 0,
    },
  },
};

test('25% vs 40% Asian: Difference should be <15 pts (plateau effect)', () => {
  // Census data must be nested under metrics.census - include all required fields
  const censusBase = {
    totalPopulation: 1000000,
    medianHouseholdIncome: 75000,
    povertyRate: 12,
    medianAge: 35,
    diversityIndex: 60,
    age18to34Percent: 25,
    age35to54Percent: 28,
    age55PlusPercent: 22,
    hispanicPercent: 15,
    blackPercent: 10,
    whitePercent: 45,
    pacificIslanderPercent: 1,
    nativeAmericanPercent: 1,
    multiracialPercent: 3,
    foreignBornPercent: 20,
  };
  
  const city25 = createMockCity('c25', 'City 25%', 'CA', {});
  (city25.metrics as any).census = { ...censusBase, asianPercent: 25 };
  
  const city40 = createMockCity('c40', 'City 40%', 'CA', {});
  (city40.metrics as any).census = { ...censusBase, asianPercent: 40 };

  // Use prefs that ONLY weight minority presence
  const prefs: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    weights: {
      climate: 0,
      costOfLiving: 0,
      demographics: 100,
      qualityOfLife: 0,
      cultural: 0,
    },
    advanced: {
      ...DEFAULT_PREFERENCES.advanced,
      demographics: {
        minPopulation: 0,
        minDiversityIndex: 0,
        weightDiversity: 0,
        weightAge: 0,
        preferredAgeGroup: 'any',
        weightPopulationSize: 0,
        weightMedianAge: 0,
        weightForeignBorn: 0,
        weightEconomicHealth: 0,
        minorityGroup: 'asian',
        minoritySubgroup: 'any',
        minMinorityPresence: 10,
        minorityImportance: 100,
        minMedianHouseholdIncome: 0,
        maxPovertyRate: 100,
      },
    },
  };

  const result = calculateScores([city25, city40], prefs);
  
  const score25 = result.rankings.find(r => r.cityId === 'c25')!.demographicsScore;
  const score40 = result.rankings.find(r => r.cityId === 'c40')!.demographicsScore;
  const diff = score40 - score25;
  
  console.log(`   25% Asian Score: ${score25.toFixed(1)}`);
  console.log(`   40% Asian Score: ${score40.toFixed(1)}`);
  console.log(`   Difference: ${diff.toFixed(1)} pts (plateau effect = <15)`);
  
  return expect(diff).toBeLessThan(15) && expect(diff).toBeGreaterThan(0);
});

test('5% Asian (below threshold) should score lower than 25%', () => {
  const censusBase = {
    totalPopulation: 1000000,
    medianHouseholdIncome: 75000,
    povertyRate: 12,
    medianAge: 35,
    diversityIndex: 60,
    age18to34Percent: 25,
    age35to54Percent: 28,
    age55PlusPercent: 22,
    hispanicPercent: 15,
    blackPercent: 10,
    whitePercent: 45,
    pacificIslanderPercent: 1,
    nativeAmericanPercent: 1,
    multiracialPercent: 3,
    foreignBornPercent: 20,
  };
  
  const city5 = createMockCity('c5', 'City 5%', 'CA', {});
  (city5.metrics as any).census = { ...censusBase, asianPercent: 5 };
  
  const city25 = createMockCity('c25', 'City 25%', 'CA', {});
  (city25.metrics as any).census = { ...censusBase, asianPercent: 25 };

  // Use prefs that ONLY weight minority presence
  const prefs: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    weights: {
      climate: 0,
      costOfLiving: 0,
      demographics: 100,
      qualityOfLife: 0,
      cultural: 0,
    },
    advanced: {
      ...DEFAULT_PREFERENCES.advanced,
      demographics: {
        minPopulation: 0,
        minDiversityIndex: 0,
        weightDiversity: 0,
        weightAge: 0,
        preferredAgeGroup: 'any',
        weightPopulationSize: 0,
        weightMedianAge: 0,
        weightForeignBorn: 0,
        weightEconomicHealth: 0,
        minorityGroup: 'asian',
        minoritySubgroup: 'any',
        minMinorityPresence: 10,
        minorityImportance: 100,
        minMedianHouseholdIncome: 0,
        maxPovertyRate: 100,
      },
    },
  };

  const result = calculateScores([city5, city25], prefs);
  
  const score5 = result.rankings.find(r => r.cityId === 'c5')!.demographicsScore;
  const score25 = result.rankings.find(r => r.cityId === 'c25')!.demographicsScore;
  
  console.log(`   5% Asian Score: ${score5.toFixed(1)}`);
  console.log(`   25% Asian Score: ${score25.toFixed(1)}`);
  
  return expect(score5).toBeLessThan(score25);
});

// ============================================
// QoL Percentile Ranking Tests
// ============================================
console.log('\n--- QoL Percentile Ranking ---\n');

const qolSafetyOnlyPrefs: UserPreferences = {
  ...DEFAULT_PREFERENCES,
  weights: {
    climate: 0,
    costOfLiving: 0,
    demographics: 0,
    qualityOfLife: 100,
    cultural: 0,
  },
  advanced: {
    ...DEFAULT_PREFERENCES.advanced,
    qualityOfLife: {
      ...DEFAULT_PREFERENCES.advanced.qualityOfLife,
      weights: {
        walkability: 0,
        safety: 100,
        airQuality: 0,
        internet: 0,
        schools: 0,
        healthcare: 0,
      },
    },
  },
};

test('Safest city should score higher than dangerous city', () => {
  const cities = [
    createMockCity('safe', 'Safest', 'CA', {
      qol: { crime: { violentCrimeRate: 100, trend3Year: 'stable' } },
    }),
    createMockCity('avg', 'Average', 'TX', {
      qol: { crime: { violentCrimeRate: 400, trend3Year: 'stable' } },
    }),
    createMockCity('danger', 'Dangerous', 'MI', {
      qol: { crime: { violentCrimeRate: 800, trend3Year: 'rising' } },
    }),
  ];

  const result = calculateScores(cities, qolSafetyOnlyPrefs);
  
  const safeScore = result.rankings.find(r => r.cityId === 'safe')!.qualityOfLifeScore;
  const dangerScore = result.rankings.find(r => r.cityId === 'danger')!.qualityOfLifeScore;
  
  console.log(`   Safest City QoL: ${safeScore.toFixed(1)}`);
  console.log(`   Dangerous City QoL: ${dangerScore.toFixed(1)}`);
  
  return expect(safeScore).toBeGreaterThan(dangerScore);
});

test('Top-percentile city should score ~90+ on safety', () => {
  // Create 10 cities with varying crime rates
  const cities = Array.from({ length: 10 }, (_, i) => 
    createMockCity(`c${i}`, `City ${i}`, 'XX', {
      qol: { crime: { violentCrimeRate: 100 + i * 80, trend3Year: 'stable' } },
    })
  );

  const result = calculateScores(cities, qolSafetyOnlyPrefs);
  
  // City 0 has the lowest crime (100) - should be top percentile
  const topScore = result.rankings.find(r => r.cityId === 'c0')!.qualityOfLifeScore;
  
  console.log(`   Top-percentile city QoL: ${topScore.toFixed(1)}`);
  
  // In a 10-city set, top city should score 90+ (90th percentile)
  return expect(topScore).toBeGreaterThan(85);
});

// ============================================
// Summary
// ============================================
console.log('\n========================================');
console.log(`   RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
