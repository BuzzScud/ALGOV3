// server.mjs (Node 18+ with "type": "module" in package.json)
import express from 'express';
import cors from 'cors';
import YahooFinance from 'yahoo-finance2';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware for debugging - log ALL requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`  Path: ${req.path}, OriginalUrl: ${req.originalUrl}`);
  console.log(`  Query:`, req.query);
  next();
});

// Serve static files (HTML, CSS, JS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create yahooFinance instance
const yahooFinance = new YahooFinance();

// Helper function to register API routes (supports both root and /trading/ paths)
// This must be defined before routes are registered
function registerApiRoute(method, path, handler) {
  // Wrap handler to add logging
  const wrappedHandler = async (req, res, next) => {
    console.log(`[ROUTE MATCHED] ${method.toUpperCase()} ${req.path} - Handler executing`);
    try {
      await handler(req, res, next);
    } catch (err) {
      console.error(`[ROUTE ERROR] ${method.toUpperCase()} ${req.path}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', details: err.message });
      }
    }
  };
  
  // Register at root level
  app[method](path, wrappedHandler);
  // Also register at /trading/ path for subdirectory deployments
  app[method](`/trading${path}`, wrappedHandler);
  // Also try without trailing slash variations
  if (path.endsWith('/')) {
    app[method](path.slice(0, -1), wrappedHandler);
    app[method](`/trading${path.slice(0, -1)}`, wrappedHandler);
  } else {
    app[method](`${path}/`, wrappedHandler);
    app[method](`/trading${path}/`, wrappedHandler);
  }
  // Log route registration for debugging
  console.log(`✓ Registered ${method.toUpperCase()} route: ${path} and /trading${path} (with variations)`);
}

// Register API routes BEFORE static file serving to ensure they're matched first
// This prevents static file middleware from intercepting API requests
// Routes will be registered later in the file, but the function is defined here

// Constants
const PHI = [3, 7, 31, 12, 19, 5, 11, 13, 17, 23, 29, 31]; // Full crystalline lattice dimensions
const TWO_PI = Math.PI * 2;
const MOD_BITS = 72n; // 64 + 8 guard bits
const MOD = 1n << MOD_BITS; // 2^72
const LAMBDA = 1n << (MOD_BITS - 2n); // 2^(72-2) for odd base cycles
const Q_FRAC_BITS = 8n; // +8 bits computations
const OUTPUT_SCALE = 1n << (64n); // after truncation, we map to 64-bit fractional space

// Elliptic curve parameters for two primes in elliptical orbit
// The oscillation between representations IS the additional dimension
// We model this as an elliptic curve: y² = x³ + ax + b (mod p)
// where p1 and p2 are the two primes in elliptical orbit
const ELLIPTIC_CURVE_A = 1n; // Curve parameter a
const ELLIPTIC_CURVE_B = 0n; // Curve parameter b (simplified form: y² = x³ + x)

// Safe modular exponentiation: a^e mod m (BigInt)
function modPow(a, e, m) {
  a = ((a % m) + m) % m;
  let result = 1n;
  while (e > 0n) {
    if (e & 1n) result = (result * a) % m;
    a = (a * a) % m;
    e >>= 1n;
  }
  return result;
}

// Compute triadic prime tower amplitude A = base^(p2^p3) mod 2^(64+8),
// with exponent reduced mod λ(2^k) since base is odd and gcd(base, 2^k)=1.
function amplitudeFromTriad(base, triad) {
  const [p1, p2, p3] = triad; // p1 is for your reference (seed prime), we build the tower base^(p2^p3)
  // Note: You asked for towers like 2^(5,7,11) and "One seed: 3". We keep base separate from primes.
  // Exponent E = p2^p3 mod LAMBDA
  const eMod = modPow(BigInt(p2), BigInt(p3), LAMBDA);
  const eEff = eMod + LAMBDA; // ensure in correct range for odd base modulo cycles
  const A = modPow(BigInt(base), eEff, MOD);
  return A; // 0..2^72-1
}

// Elliptic curve point addition: P + Q on curve y² = x³ + ax + b (mod p)
// Returns {x, y} or null if point at infinity
function ellipticCurveAdd(p1, p2, a, b, p) {
  if (p1 === null) return p2;
  if (p2 === null) return p1;
  
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  
  // Point doubling (P + P)
  if (x1 === x2 && y1 === y2) {
    if (y1 === 0n) return null; // Point at infinity
    // Slope m = (3x₁² + a) / (2y₁) mod p
    const numerator = (3n * x1 * x1 + a) % p;
    const denominator = (2n * y1) % p;
    const invDenom = modPow(denominator, p - 2n, p); // Modular inverse
    const m = (numerator * invDenom) % p;
    
    // x₃ = m² - 2x₁ mod p
    const x3 = (m * m - 2n * x1) % p;
    // y₃ = m(x₁ - x₃) - y₁ mod p
    const y3 = (m * (x1 - x3) - y1) % p;
    return [(x3 + p) % p, (y3 + p) % p];
  }
  
  // Point addition (P ≠ Q)
  if (x1 === x2) return null; // Vertical line, point at infinity
  
  // Slope m = (y₂ - y₁) / (x₂ - x₁) mod p
  const dx = (x2 - x1) % p;
  const dy = (y2 - y1) % p;
  const invDx = modPow((dx + p) % p, p - 2n, p); // Modular inverse
  const m = (dy * invDx) % p;
  
  // x₃ = m² - x₁ - x₂ mod p
  const x3 = (m * m - x1 - x2) % p;
  // y₃ = m(x₁ - x₃) - y₁ mod p
  const y3 = (m * (x1 - x3) - y1) % p;
  return [(x3 + p) % p, (y3 + p) % p];
}

// Compute elliptic curve scalar multiplication: k * P
// Uses double-and-add algorithm
function ellipticCurveScalarMult(k, point, a, b, p) {
  if (k === 0n || point === null) return null;
  if (k === 1n) return point;
  
  let result = null;
  let addend = point;
  let kRemaining = k;
  
  while (kRemaining > 0n) {
    if (kRemaining & 1n) {
      result = ellipticCurveAdd(result, addend, a, b, p);
    }
    addend = ellipticCurveAdd(addend, addend, a, b, p);
    kRemaining >>= 1n;
  }
  
  return result;
}

// Find point on elliptic curve y² = x³ + ax + b (mod p) for given x
// Returns {x, y} or null if no point exists
function findPointOnCurve(x, a, b, p) {
  x = ((x % p) + p) % p;
  // y² = x³ + ax + b mod p
  const ySquared = (x * x * x + a * x + b) % p;
  
  // Check if y² is a quadratic residue (Euler's criterion)
  const legendre = modPow(ySquared, (p - 1n) / 2n, p);
  if (legendre !== 1n) return null; // No solution
  
  // Find square root using Tonelli-Shanks or simple method for small p
  // For simplicity, try values until we find y such that y² = ySquared
  for (let y = 0n; y < p; y++) {
    if ((y * y) % p === ySquared) {
      return [x, y];
    }
  }
  return null;
}

// Track oscillation between two representations (the missing dimension)
// The oscillation itself IS the additional dimension
// Returns oscillation state between two views/representations
let oscillationState = { phase: 0, representation: 0 }; // Global state to track oscillation

function trackRepresentationOscillation(n, horizon) {
  // The oscillation between two similar representations creates the 3D pattern
  // This is the missing dimension - the oscillation itself
  const oscillationPeriod = horizon / 2; // Full cycle over half horizon
  const phase = (n % oscillationPeriod) / oscillationPeriod; // 0 to 1
  
  // Oscillate between two representations (0 and 1)
  // This creates the "flipping back and forth" pattern
  const representation = Math.sin(phase * TWO_PI) > 0 ? 1 : 0;
  
  // 3D oscillation: two scalars oscillating in elliptical pattern
  const theta1 = (n * TWO_PI) / horizon; // First scalar phase
  const theta2 = (n * TWO_PI * 1.618) / horizon; // Second scalar phase (golden ratio)
  
  // Elliptical orbit parameters
  const a = 1.0; // Semi-major axis
  const b = 0.618; // Semi-minor axis (golden ratio)
  const x = a * Math.cos(theta1);
  const y = b * Math.sin(theta2);
  const z = Math.sin(theta1 + theta2); // 3D component
  
  // Update global state
  oscillationState = { phase, representation, theta1, theta2, x, y, z };
  
  return oscillationState;
}

// Two primes in elliptical orbit: compute orbital position at step n
// Returns the two primes' positions on the elliptic curve
// This represents the 3D oscillation of two scalars
// The oscillation between two representations IS the additional dimension
function ellipticalOrbitPrimes(p1, p2, n, horizon) {
  // Track the oscillation between representations (the missing dimension)
  const oscillation = trackRepresentationOscillation(n, horizon);
  
  // Map primes to elliptic curve coordinates
  // Use primes as x-coordinates, find corresponding y
  const p = BigInt(Math.max(p1, p2) * 2 + 1); // Use larger prime for curve modulus
  
  // Initial points on curve
  let point1 = findPointOnCurve(BigInt(p1), ELLIPTIC_CURVE_A, ELLIPTIC_CURVE_B, p);
  let point2 = findPointOnCurve(BigInt(p2), ELLIPTIC_CURVE_A, ELLIPTIC_CURVE_B, p);
  
  // If points don't exist, use primes directly as coordinates
  if (point1 === null) point1 = [BigInt(p1), BigInt(p1)];
  if (point2 === null) point2 = [BigInt(p2), BigInt(p2)];
  
  // Use oscillation state to create elliptical orbit
  // The oscillation between representations creates the orbital pattern
  const theta = oscillation.theta1;
  const orbitalRadius = 1.0 + 0.1 * Math.sin(oscillation.theta1 + oscillation.theta2); // Elliptical shape from 3D oscillation
  
  // Apply 3D oscillation to orbital positions
  // The two scalars (x, y, z) create the elliptical orbit
  const x1Orbit = point1[0] * BigInt(Math.floor((1.0 + oscillation.x * 0.1) * 1000)) / 1000n;
  const y1Orbit = point1[1] * BigInt(Math.floor((1.0 + oscillation.y * 0.1) * 1000)) / 1000n;
  const x2Orbit = point2[0] * BigInt(Math.floor((1.0 + oscillation.z * 0.1) * 1000)) / 1000n;
  const y2Orbit = point2[1] * BigInt(Math.floor((1.0 + oscillation.x * 0.1) * 1000)) / 1000n;
  
  return {
    p1Point: [x1Orbit % p, y1Orbit % p],
    p2Point: [x2Orbit % p, y2Orbit % p],
    orbitalAngle: theta,
    orbitalRadius,
    oscillationPhase: oscillation.phase,
    representation: oscillation.representation,
    oscillation3D: { x: oscillation.x, y: oscillation.y, z: oscillation.z }
  };
}

// Recursive tetration tower builder with elliptic curve orbital primes
// Structure: base^(p1^(p2^(p3^(p4^(p5^p6))))) where each level uses 3 primes
// PLUS two primes in elliptical orbit that stabilize the oscillation
// Tower height/depth IS the additional dimensions - each level represents a dimension
// Uses modular arithmetic to map to "clock" surface (circular/periodic structure)
// 
// For height 1: base^(p1^(p2^p3)) with orbital primes p_orb1, p_orb2
// For height 2: base^(p1^(p2^(p3^(p4^(p5^p6))))) with orbital primes
// Each height adds 3 more primes to the nesting depth
function buildTetrationTowerExponent(primes, height, startIdx = 0, orbitalPrimes = null, n = 0, horizon = 240) {
  if (height === 0) {
    // Base case: return 1 (identity for exponentiation)
    return 1n;
  }
  
  if (primes.length < startIdx + 3 * height) {
    throw new Error(`Insufficient primes for tower height ${height}`);
  }
  
  // Get 3 primes for this level
  const [p1, p2, p3] = primes.slice(startIdx, startIdx + 3);
  
  // If we have orbital primes, compute their elliptical orbit position
  // The oscillation between two representations IS the additional dimension
  let orbitalModifier = 1n;
  if (orbitalPrimes && orbitalPrimes.length >= 2) {
    const orbit = ellipticalOrbitPrimes(orbitalPrimes[0], orbitalPrimes[1], n, horizon);
    
    // Use the oscillation state to modify the exponent
    // The representation oscillation (0 or 1) creates the "flipping" pattern
    // The 3D oscillation (x, y, z) creates the stabilizing effect
    const representationFactor = orbit.representation === 1 ? 1.0 : -1.0; // Flip between representations
    const oscillation3DFactor = 1.0 + (orbit.oscillation3D.x + orbit.oscillation3D.y + orbit.oscillation3D.z) * 0.1;
    
    // Combine representation oscillation with 3D oscillation
    const combinedFactor = representationFactor * oscillation3DFactor;
    const orbitalFactor = BigInt(Math.floor((orbit.orbitalRadius * Math.abs(combinedFactor) * 1000) % 1000));
    orbitalModifier = (orbitalFactor % LAMBDA) + 1n;
  }
  
  if (height === 1) {
    // Base case for height 1: p1^(p2^p3) with orbital modification
    const p2p3 = modPow(BigInt(p2), BigInt(p3), LAMBDA);
    const p2p3Modified = (p2p3 * orbitalModifier) % LAMBDA;
    const p1Exp = modPow(BigInt(p1), p2p3Modified, LAMBDA);
    return p1Exp;
  }
  
  // Recursive case: p1^(p2^(p3^(tower of height-1))) with orbital modification
  // Build inner tower starting from next 3 primes
  const innerTower = buildTetrationTowerExponent(primes, height - 1, startIdx + 3, orbitalPrimes, n, horizon);
  
  // Apply orbital modification to inner tower
  const innerTowerModified = (innerTower * orbitalModifier) % LAMBDA;
  
  // Build nested structure: p3^innerTowerModified mod LAMBDA (clock surface mapping)
  const p3Exp = modPow(BigInt(p3), innerTowerModified, LAMBDA);
  
  // Next level: p2^p3Exp mod LAMBDA
  const p2Exp = modPow(BigInt(p2), p3Exp, LAMBDA);
  
  // Top level: p1^p2Exp mod LAMBDA
  const p1Exp = modPow(BigInt(p1), p2Exp, LAMBDA);
  
  return p1Exp;
}

// Compute tetration tower amplitude with variable height and elliptical orbital primes
// Each height level represents an additional dimension
// Two primes in elliptical orbit stabilize the oscillation (the missing dimension)
// Uses modular arithmetic to map to clock surface for geometric consistency
function tetrationTowerAmplitude(base, primes, towerHeight, startIdx = 0, orbitalPrimes = null, n = 0, horizon = 240) {
  // Build the nested exponent tower with orbital primes
  const exponentTower = buildTetrationTowerExponent(primes, towerHeight, startIdx, orbitalPrimes, n, horizon);
  
  // Map to clock surface: ensure exponent is in correct range for odd base
  const eEff = exponentTower + LAMBDA;
  
  // Final amplitude: base^exponentTower mod MOD
  const A = modPow(BigInt(base), eEff, MOD);
  
  return A; // 0..2^72-1
}

// Generate tetration towers with variable height/depth and elliptical orbital primes
// Each tower height level represents an additional dimension
// Towers use non-overlapping primes across all levels for maximum entropy
// Tower height determines dimensional depth (combinatorial complexity)
// Two primes in elliptical orbit stabilize the oscillation (the missing dimension)
function generateTetrationTowers(base, depthPrime, count, primes, towerHeight = null, horizon = 240) {
  const idx = primes.indexOf(depthPrime);
  if (idx === -1) throw new Error(`Depth prime ${depthPrime} not in primes list`);
  
  // Select two primes for elliptical orbit (the missing dimension)
  // These primes orbit elliptically and stabilize the oscillation
  // Choose primes near the depth prime but not used in towers
  let orbitalPrime1 = null;
  let orbitalPrime2 = null;
  
  // Find two primes for orbital use (prefer primes near depth prime)
  for (let i = Math.max(0, idx - 10); i < Math.min(primes.length, idx + 10); i++) {
    if (orbitalPrime1 === null) {
      orbitalPrime1 = primes[i];
    } else if (orbitalPrime2 === null && primes[i] !== orbitalPrime1) {
      orbitalPrime2 = primes[i];
      break;
    }
  }
  
  // Fallback if we couldn't find primes near depth
  if (orbitalPrime1 === null) orbitalPrime1 = primes[Math.max(0, idx - 1)];
  if (orbitalPrime2 === null) orbitalPrime2 = primes[Math.min(primes.length - 1, idx + 1)];
  
  const orbitalPrimes = [orbitalPrime1, orbitalPrime2];
  
  // Determine optimal tower height based on available dimensions
  // Each level uses 3 primes, so height = dimensions / 3 (rounded)
  // For 12 PHI dimensions, we can support height up to 4 (12 primes per tower)
  // Increased depth for cymatic pattern analysis and radial node detection
  if (towerHeight === null) {
    // Calculate based on available primes and count
    // Each tower needs 3 * height primes, and we have count towers
    // Reserve 2 primes for orbital use
    // Increased max height to 6 for better radial pattern detection
    const primesPerTower = Math.floor((primes.length - idx - 2) / count);
    towerHeight = Math.max(2, Math.min(6, Math.floor(primesPerTower / 3))); // Increased from 4 to 6
  }
  
  const towers = [];
  const globalUsedPrimes = new Set(orbitalPrimes); // Track all primes used (including orbital)
  let currentIdx = Math.max(0, idx - Math.floor(count * towerHeight * 1.5));
  
  for (let t = 0; t < count; t++) {
    // Each tower needs 3 * towerHeight primes (3 per level)
    const towerPrimes = [];
    const towerUsedPrimes = new Set(); // Primes for this specific tower
    
    // Collect all primes needed for this tower
    let searchIdx = currentIdx;
    while (towerPrimes.length < 3 * towerHeight && searchIdx < primes.length) {
      const prime = primes[searchIdx];
      // Must not be used in this tower OR any other tower OR orbital primes
      if (!globalUsedPrimes.has(prime) && !towerUsedPrimes.has(prime)) {
        towerPrimes.push(prime);
        globalUsedPrimes.add(prime);
        towerUsedPrimes.add(prime);
      }
      searchIdx++;
    }
    
    // If we couldn't get enough primes, try expanding search
    if (towerPrimes.length < 3 * towerHeight) {
      searchIdx = 0;
      while (towerPrimes.length < 3 * towerHeight && searchIdx < primes.length) {
        const prime = primes[searchIdx];
        if (!globalUsedPrimes.has(prime) && !towerUsedPrimes.has(prime)) {
          towerPrimes.push(prime);
          globalUsedPrimes.add(prime);
          towerUsedPrimes.add(prime);
        }
        searchIdx++;
      }
    }
    
    if (towerPrimes.length >= 3 * towerHeight) {
      // Build tower with specified height
      // Each level uses 3 primes: [p1, p2, p3], [p4, p5, p6], etc.
      const towerLevels = [];
      for (let h = 0; h < towerHeight; h++) {
        const levelPrimes = towerPrimes.slice(h * 3, (h + 1) * 3);
        towerLevels.push(levelPrimes);
      }
      
      // Calculate amplitude using recursive tower builder with orbital primes
      // Note: amplitude is computed per step n in the projection loop
      // For now, compute initial amplitude at n=0
      const amplitude = tetrationTowerAmplitude(base, towerPrimes, towerHeight, 0, orbitalPrimes, 0, horizon);
      
      towers.push({
        primes: towerPrimes, // All primes used in this tower
        levels: towerLevels,  // Primes organized by level
        height: towerHeight,
        amplitude, // Initial amplitude (will be recomputed per step with orbital position)
        orbitalPrimes // The two primes in elliptical orbit
      });
      
      currentIdx = searchIdx;
    } else {
      // Fallback: reduce height if needed
      const reducedHeight = Math.floor(towerPrimes.length / 3);
      if (reducedHeight >= 1) {
        const towerLevels = [];
        for (let h = 0; h < reducedHeight; h++) {
          const levelPrimes = towerPrimes.slice(h * 3, (h + 1) * 3);
          towerLevels.push(levelPrimes);
        }
        const amplitude = tetrationTowerAmplitude(base, towerPrimes, reducedHeight, 0, orbitalPrimes, 0, horizon);
        towers.push({
          primes: towerPrimes,
          levels: towerLevels,
          height: reducedHeight,
          amplitude,
          orbitalPrimes
        });
      }
    }
  }
  
  return { towers, orbitalPrimes };
}

// Turn a 72-bit amplitude to symmetric float [-1, +1), truncating +8 bits before mapping
function amplitudeToSymmetric(A72) {
  const aQ8 = A72 >> Q_FRAC_BITS; // drop 8 guard bits, now in 0..2^64-1
  const aUnit = Number(aQ8) / Number(1n << 64n); // [0,1)
  return (aUnit * 2) - 1; // (-1, +1)
}

// Z(n): aggregate cosine of all 12 φ_d without sweeping dimensions
function latticeOscillatorZ(n) {
  const k = (n - 1);
  let sum = 0;
  for (let i = 0; i < PHI.length; i++) {
    const angle = k * (TWO_PI / 12) * PHI[i];
    sum += Math.cos(angle);
  }
  return sum / PHI.length; // average in [-1,1]
}

// Dimensional oscillator: compute Z(n) for each dimension separately
function dimensionalOscillators(n) {
  const k = (n - 1);
  const oscillations = [];
  for (let i = 0; i < PHI.length; i++) {
    const angle = k * (TWO_PI / 12) * PHI[i];
    oscillations.push(Math.cos(angle));
  }
  return oscillations; // Array of 12 dimensional values
}

// Discrete Fourier Transform (DFT) for frequency analysis
// Isolates frequency components in the signal
function discreteFourierTransform(signal) {
  const N = signal.length;
  const frequencies = [];
  
  for (let k = 0; k < N; k++) {
    let real = 0;
    let imag = 0;
    
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      real += signal[n] * Math.cos(angle);
      imag += signal[n] * Math.sin(angle);
    }
    
    const magnitude = Math.sqrt(real * real + imag * imag) / N;
    const phase = Math.atan2(imag, real);
    const frequency = k / N; // Normalized frequency [0, 1]
    
    frequencies.push({
      k,
      frequency,
      magnitude,
      phase,
      real,
      imag
    });
  }
  
  return frequencies;
}

// Harmonic dampening filter
// Reduces high-frequency noise while preserving signal structure
function harmonicDampening(signal, dampingFactor = 0.1) {
  const filtered = [...signal];
  const N = signal.length;
  
  // Apply exponential dampening to high frequencies
  for (let i = 1; i < N - 1; i++) {
    const delta = signal[i] - signal[i-1];
    filtered[i] = signal[i] - dampingFactor * delta;
  }
  
  return filtered;
}

// Isolate 2D oscillation (consistent growth pattern)
// Detects the primary oscillation pattern
function isolate2DOscillation(prices) {
  // Remove trend to isolate oscillation
  const N = prices.length;
  const trend = [];
  const detrended = [];
  
  // Calculate linear trend
  const first = prices[0];
  const last = prices[N - 1];
  const slope = (last - first) / (N - 1);
  
  for (let i = 0; i < N; i++) {
    const expected = first + slope * i;
    trend.push(expected);
    detrended.push(prices[i] - expected);
  }
  
  // Apply Fourier analysis to detrended signal
  const frequencies = discreteFourierTransform(detrended);
  
  // Find dominant frequency (2D oscillation)
  frequencies.sort((a, b) => b.magnitude - a.magnitude);
  const dominantFreq = frequencies[0];
  
  return {
    trend,
    detrended,
    dominantFrequency: dominantFreq.frequency,
    dominantMagnitude: dominantFreq.magnitude,
    dominantPhase: dominantFreq.phase,
    frequencies
  };
}

// Isolate secondary prime oscillation
// Detects frequency variations along the primary oscillation
function isolateSecondaryPrimeOscillation(prices, primes) {
  const N = prices.length;
  const primeOscillations = [];
  
  // For each prime, analyze its frequency component
  for (const prime of primes.slice(0, 12)) {
    // Create prime-modulated signal
    const modulated = prices.map((p, i) => {
      const phase = (i * TWO_PI) / prime;
      return p * Math.cos(phase);
    });
    
    // Fourier analysis of modulated signal
    const frequencies = discreteFourierTransform(modulated);
    frequencies.sort((a, b) => b.magnitude - a.magnitude);
    
    primeOscillations.push({
      prime,
      dominantFreq: frequencies[0],
      allFrequencies: frequencies
    });
  }
  
  return primeOscillations;
}

// Detect nodes in prime relationships (kissing sphere problem)
// Finds points where prime relationships create stable nodes
function detectPrimeNodes(towers, primes) {
  const nodes = [];
  
  // Analyze prime relationships across towers
  for (let i = 0; i < towers.length; i++) {
    const tower = towers[i];
    const towerPrimes = tower.primes || tower.levels.flat();
    
    // Check for prime relationships (ratios, differences, etc.)
    for (let j = 0; j < towerPrimes.length - 1; j++) {
      const p1 = towerPrimes[j];
      const p2 = towerPrimes[j + 1];
      
      // Calculate prime relationship metrics
      const ratio = p2 / p1;
      const diff = p2 - p1;
      const gcd = greatestCommonDivisor(p1, p2);
      
      // Node detection: stable relationships
      if (Math.abs(ratio - Math.round(ratio)) < 0.1) {
        nodes.push({
          tower: i,
          primes: [p1, p2],
          ratio,
          diff,
          gcd,
          type: 'ratio_node'
        });
      }
      
      if (diff <= 6 && diff >= 2) { // Twin prime-like relationships
        nodes.push({
          tower: i,
          primes: [p1, p2],
          ratio,
          diff,
          gcd,
          type: 'twin_node'
        });
      }
    }
  }
  
  return nodes;
}

// Greatest Common Divisor
function greatestCommonDivisor(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

// Analyze radial/clock face pattern
// Detects phase angles and radial distribution
function analyzeRadialPattern(prices, horizon) {
  const N = prices.length;
  const radialData = [];
  
  // Normalize prices to radial coordinates
  const center = prices[0];
  const maxRadius = Math.max(...prices.map(p => Math.abs(p - center)));
  
  for (let i = 0; i < N; i++) {
    const phaseAngle = (i * TWO_PI) / horizon; // Clock face phase
    const radius = (prices[i] - center) / maxRadius; // Radial distance from center
    const x = radius * Math.cos(phaseAngle);
    const y = radius * Math.sin(phaseAngle);
    
    radialData.push({
      step: i,
      phaseAngle,
      radius,
      x,
      y,
      price: prices[i]
    });
  }
  
  // Detect radial nodes (points where lines converge/diverge)
  const radialNodes = [];
  for (let i = 1; i < N - 1; i++) {
    const prevRadius = radialData[i - 1].radius;
    const currRadius = radialData[i].radius;
    const nextRadius = radialData[i + 1].radius;
    
    // Node: local minimum or maximum in radius
    if ((currRadius < prevRadius && currRadius < nextRadius) ||
        (currRadius > prevRadius && currRadius > nextRadius)) {
      radialNodes.push({
        step: i,
        ...radialData[i]
      });
    }
  }
  
  return {
    radialData,
    radialNodes,
    center,
    maxRadius
  };
}

// Cymatic pattern analysis
// Analyzes hyper-dimensional wave patterns
function analyzeCymaticPattern(projections, primes, horizon) {
  const cymaticData = [];
  
  // For each projection line, analyze its wave pattern
  for (let i = 0; i < projections.length; i++) {
    const proj = projections[i];
    const prices = proj.pointsQ8.map(q8 => q8 / 256.0);
    
    // Isolate 2D oscillation
    const oscillation2D = isolate2DOscillation(prices);
    
    // Apply harmonic dampening
    const dampened = harmonicDampening(prices, 0.1);
    
    // Fourier analysis
    const frequencies = discreteFourierTransform(prices);
    frequencies.sort((a, b) => b.magnitude - a.magnitude);
    
    // Radial pattern analysis
    const radial = analyzeRadialPattern(prices, horizon);
    
    // Extract dominant frequencies
    const dominantFreqs = frequencies.slice(0, 5).map(f => ({
      frequency: f.frequency,
      magnitude: f.magnitude,
      phase: f.phase
    }));
    
    cymaticData.push({
      projectionIndex: i,
      tower: proj.tower,
      oscillation2D,
      dampened,
      frequencies: dominantFreqs,
      radial,
      normalized: prices.map(p => (p - prices[0]) / prices[0]) // Normalized for common factor detection
    });
  }
  
  // Detect common factors (flat/level lines)
  const normalizedValues = cymaticData.map(c => c.normalized);
  const commonFactors = [];
  
  for (let i = 0; i < normalizedValues.length; i++) {
    for (let j = i + 1; j < normalizedValues.length; j++) {
      const diff = normalizedValues[i].map((v, idx) => Math.abs(v - normalizedValues[j][idx]));
      const avgDiff = diff.reduce((a, b) => a + b, 0) / diff.length;
      
      // If average difference is small, they share a common factor
      if (avgDiff < 0.01) {
        commonFactors.push({
          projection1: i,
          projection2: j,
          avgDifference: avgDiff,
          factor: (cymaticData[i].normalized[0] + cymaticData[j].normalized[0]) / 2
        });
      }
    }
  }
  
  return {
    cymaticData,
    commonFactors
  };
}

// Track oscillation patterns across dimensions
// Returns oscillation metrics including drift, skew, and polarity patterns
// Enhanced with Fourier analysis and signal processing
function analyzeDimensionalOscillation(horizon) {
  const dimensionalData = [];
  const aggregateOscillations = [];
  
  for (let n = 1; n <= horizon; n++) {
    const dimOsc = dimensionalOscillators(n);
    const aggOsc = latticeOscillatorZ(n);
    dimensionalData.push(dimOsc);
    aggregateOscillations.push(aggOsc);
  }
  
  // Calculate oscillation metrics per dimension
  const dimMetrics = [];
  for (let d = 0; d < PHI.length; d++) {
    const dimValues = dimensionalData.map(row => row[d]);
    const mean = dimValues.reduce((a, b) => a + b, 0) / dimValues.length;
    const variance = dimValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / dimValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate zero crossings for this dimension
    let zeroCrossings = 0;
    for (let i = 1; i < dimValues.length; i++) {
      if ((dimValues[i] > 0 && dimValues[i-1] <= 0) || 
          (dimValues[i] < 0 && dimValues[i-1] >= 0)) {
        zeroCrossings++;
      }
    }
    
    // Calculate drift (trend in oscillation)
    const firstHalf = dimValues.slice(0, Math.floor(dimValues.length / 2));
    const secondHalf = dimValues.slice(Math.floor(dimValues.length / 2));
    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const drift = secondMean - firstMean;
    
    // Calculate skew (asymmetry)
    const sorted = [...dimValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const skew = (mean - median) / (stdDev || 1);
    
    dimMetrics.push({
      dimension: d,
      phi: PHI[d],
      mean,
      stdDev,
      variance,
      zeroCrossings,
      drift,
      skew,
      min: Math.min(...dimValues),
      max: Math.max(...dimValues)
    });
  }
  
  // Calculate cross-dimensional oscillation patterns
  // Quadratic pattern detection: measure oscillation between polarity
  const polarityOscillations = [];
  for (let n = 1; n <= horizon; n++) {
    const dimOsc = dimensionalOscillators(n);
    // Count positive vs negative dimensions
    const positive = dimOsc.filter(v => v > 0).length;
    const negative = dimOsc.filter(v => v < 0).length;
    const polarity = (positive - negative) / PHI.length; // Normalized polarity [-1, 1]
    polarityOscillations.push(polarity);
  }
  
  // Detect quadratic oscillation pattern in polarity
  let quadraticPattern = 0;
  if (polarityOscillations.length >= 3) {
    // Simple quadratic fit coefficient (second derivative approximation)
    const mid = Math.floor(polarityOscillations.length / 2);
    const first = polarityOscillations[0];
    const middle = polarityOscillations[mid];
    const last = polarityOscillations[polarityOscillations.length - 1];
    quadraticPattern = (last - 2 * middle + first) / (polarityOscillations.length * polarityOscillations.length);
  }
  
  // Calculate overall entropy reduction metric
  // Lower entropy = more stable pattern
  const aggregateVariance = aggregateOscillations.reduce((sum, v, i, arr) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return sum + Math.pow(v - mean, 2);
  }, 0) / aggregateOscillations.length;
  const entropy = Math.log(aggregateVariance + 1e-10);
  
  // Apply harmonic dampening to aggregate oscillations
  const dampenedOscillations = harmonicDampening(aggregateOscillations, 0.1);
  
  // Fourier analysis of aggregate oscillations
  const frequencySpectrum = discreteFourierTransform(aggregateOscillations);
  frequencySpectrum.sort((a, b) => b.magnitude - a.magnitude);
  
  // Extract dominant frequencies
  const dominantFrequencies = frequencySpectrum.slice(0, 5).map(f => ({
    frequency: f.frequency,
    magnitude: f.magnitude,
    phase: f.phase
  }));
  
  return {
    dimensionalMetrics: dimMetrics,
    polarityOscillations,
    quadraticPattern,
    aggregateVariance,
    entropy,
    aggregateOscillations,
    dampenedOscillations,
    frequencySpectrum,
    dominantFrequencies
  };
}

// Create graph representation from projection points
// Each projection line becomes a graph in memory for analysis
function createProjectionGraph(points, tower, horizon) {
  const prices = points.map(q8 => q8 / 256.0);
  
  // Analyze the graph structure
  const graph = {
    points: prices,
    tower: tower,
    // Calculate graph metrics
    mean: prices.reduce((a, b) => a + b, 0) / prices.length,
    variance: prices.reduce((sum, v, i, arr) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return sum + Math.pow(v - mean, 2);
    }, 0) / prices.length,
    // Detect turning points (nodes in the graph)
    turningPoints: [],
    // Calculate slopes between points
    slopes: []
  };
  
  // Find turning points and calculate slopes
  for (let i = 1; i < prices.length; i++) {
    const slope = (prices[i] - prices[i-1]) / Math.max(prices[i-1], 1e-10);
    graph.slopes.push(slope);
    
    if (i > 1) {
      const prevSlope = graph.slopes[i - 2];
      // Turning point: sign change in slope
      if (Math.sign(prevSlope) !== Math.sign(slope)) {
        graph.turningPoints.push({
          index: i - 1,
          price: prices[i - 1],
          slope: slope
        });
      }
    }
  }
  
  graph.stdDev = Math.sqrt(graph.variance);
  
  return graph;
}

// Extract anchors from a single graph
// Anchors are stable points in the graph representation
function extractGraphAnchors(graph) {
  const anchors = [];
  
  // Anchors are turning points with low variance (stable nodes)
  graph.turningPoints.forEach((tp, idx) => {
    // Calculate local stability around turning point
    const window = 5;
    const start = Math.max(0, tp.index - window);
    const end = Math.min(graph.points.length, tp.index + window);
    const localPoints = graph.points.slice(start, end);
    const localMean = localPoints.reduce((a, b) => a + b, 0) / localPoints.length;
    const localVariance = localPoints.reduce((sum, v) => sum + Math.pow(v - localMean, 2), 0) / localPoints.length;
    const localStdDev = Math.sqrt(localVariance);
    
    anchors.push({
      index: tp.index,
      price: tp.price,
      slope: tp.slope,
      stability: 1.0 / (localStdDev + 1e-10),
      localStdDev,
      localMean
    });
  });
  
  // Sort by stability (most stable first)
  anchors.sort((a, b) => b.stability - a.stability);
  
  return anchors.slice(0, 5); // Top 5 anchors per graph
}

// Meta-recursive analysis: analyze anchors from all graphs
// Each graph represents the missed additional oscillation
// This meta-analysis captures the oscillation dimension
function metaRecursiveAnchorAnalysis(graphs, recursionDepth = 2) {
  if (recursionDepth === 0) {
    return { metaAnchors: [], oscillation: null };
  }
  
  // Extract anchors from each graph
  const allAnchors = graphs.map((graph, graphIdx) => ({
    graphIndex: graphIdx,
    tower: graph.tower,
    anchors: extractGraphAnchors(graph),
    graphMetrics: {
      mean: graph.mean,
      stdDev: graph.stdDev,
      variance: graph.variance
    }
  }));
  
  // Analyze anchors across all graphs (meta-level)
  const metaAnchors = [];
  
  // Find common anchor patterns across graphs
  for (let i = 0; i < allAnchors.length; i++) {
    const graphAnchors = allAnchors[i];
    
    for (const anchor of graphAnchors.anchors) {
      // Check if similar anchors exist in other graphs
      const similarAnchors = [];
      
      for (let j = 0; j < allAnchors.length; j++) {
        if (i === j) continue;
        
        for (const otherAnchor of allAnchors[j].anchors) {
          // Similar if price and index are close
          const priceDiff = Math.abs(anchor.price - otherAnchor.price) / Math.max(anchor.price, 1e-10);
          const indexDiff = Math.abs(anchor.index - otherAnchor.index);
          
          if (priceDiff < 0.05 && indexDiff < 10) {
            similarAnchors.push({
              graphIndex: j,
              anchor: otherAnchor,
              priceDiff,
              indexDiff
            });
          }
        }
      }
      
      if (similarAnchors.length > 0) {
        metaAnchors.push({
          primaryGraph: i,
          primaryAnchor: anchor,
          similarAnchors: similarAnchors,
          metaStability: anchor.stability * (1 + similarAnchors.length * 0.1)
        });
      }
    }
  }
  
  // Sort meta-anchors by stability
  metaAnchors.sort((a, b) => b.metaStability - a.metaStability);
  
  // Calculate meta-oscillation from anchor patterns
  // The oscillation between graphs represents the additional dimension
  const metaOscillation = [];
  for (let step = 0; step < graphs[0].points.length; step++) {
    // Calculate oscillation as variance across graphs at this step
    const stepValues = graphs.map(g => g.points[step]);
    const stepMean = stepValues.reduce((a, b) => a + b, 0) / stepValues.length;
    const stepVariance = stepValues.reduce((sum, v) => sum + Math.pow(v - stepMean, 2), 0) / stepValues.length;
    
    metaOscillation.push({
      step,
      mean: stepMean,
      variance: stepVariance,
      oscillation: Math.sqrt(stepVariance) / Math.max(stepMean, 1e-10) // Normalized oscillation
    });
  }
  
  // Recursive call: analyze the meta-oscillation as if it were graphs
  if (recursionDepth > 1) {
    // Create pseudo-graphs from meta-oscillation patterns
    const metaGraphs = metaAnchors.slice(0, Math.min(5, metaAnchors.length)).map(metaAnchor => {
      // Create a graph representation from the meta-anchor pattern
      const metaPoints = graphs.map(g => {
        const anchor = metaAnchor.primaryAnchor;
        // Use anchor as reference point
        return g.points[anchor.index] || g.mean;
      });
      
      return createProjectionGraph(
        metaPoints.map(p => Math.floor(p * 256)),
        metaAnchor.primaryGraph,
        graphs[0].points.length
      );
    });
    
    // Recursive analysis
    const deeperAnalysis = metaRecursiveAnchorAnalysis(metaGraphs, recursionDepth - 1);
    
    return {
      metaAnchors: metaAnchors.slice(0, 10),
      metaOscillation,
      deeperAnalysis
    };
  }
  
  return {
    metaAnchors: metaAnchors.slice(0, 10),
    metaOscillation
  };
}

// Recursive reassessment using dimensional oscillations as anchors
// Detects drift/skew and retriangulates from oscillation anchors
// Uses orbital primes to stabilize oscillation (the missing dimension)
// Enhanced with multi-graph recursive anchor analysis
function recursiveReassessment(basePrice, towers, oscillationAnalysis, beta, horizon, base, orbitalPrimes) {
  const { dimensionalMetrics, polarityOscillations, quadraticPattern } = oscillationAnalysis;
  
  // Identify anchor dimensions (most stable oscillations)
  const anchors = dimensionalMetrics
    .map((m, i) => ({ ...m, index: i }))
    .sort((a, b) => a.stdDev - b.stdDev) // Lower stdDev = more stable
    .slice(0, 3); // Top 3 most stable dimensions as anchors
  
  // Calculate scalar corrections from oscillation drift
  const driftScalars = dimensionalMetrics.map(m => {
    // Use drift as a correction factor, normalized
    return 1.0 + (m.drift * 0.1); // Scale drift impact
  });
  
  // Calculate skew corrections
  const skewScalars = dimensionalMetrics.map(m => {
    // Correct for skew asymmetry
    return 1.0 - (m.skew * 0.05);
  });
  
  // Build stabilized projections using anchors and orbital primes
  const stabilizedProjections = [];
  
  for (let t = 0; t < towers.length; t++) {
    const tower = towers[t];
    
    // Get anchor corrections for this tower
    const anchorCorrections = anchors.map(anchor => {
      const anchorOsc = dimensionalMetrics[anchor.index];
      return {
        dimension: anchor.index,
        correction: 1.0 + (anchorOsc.drift * 0.1) - (anchorOsc.skew * 0.05)
      };
    });
    
    // Average anchor correction
    const avgAnchorCorrection = anchorCorrections.reduce((sum, a) => sum + a.correction, 0) / anchorCorrections.length;
    
    // Apply quadratic pattern as additional scalar
    const quadraticScalar = 1.0 + (quadraticPattern * 0.01);
    
    // Build projection with orbital prime stabilization
    // Key insight: orbital primes create the oscillation that IS the missing dimension
    let p = basePrice;
    const points = [];
    
    for (let n = 1; n <= horizon; n++) {
      // Recompute amplitude at step n using orbital prime position
      // The orbital primes' position changes at each step, creating the stabilizing oscillation
      const orbitalAmplitude = tetrationTowerAmplitude(
        base,
        tower.primes,
        tower.height,
        0,
        orbitalPrimes,
        n,
        horizon
      );
      const aSym = amplitudeToSymmetric(orbitalAmplitude);
      
      const Z = latticeOscillatorZ(n);
      
      // Get dimensional corrections for this step
      const dimOsc = dimensionalOscillators(n);
      const dimCorrection = dimOsc.reduce((sum, val, idx) => {
        return sum + (val * driftScalars[idx] * skewScalars[idx]);
      }, 0) / PHI.length;
      
      // Get orbital position for this step (the 3D oscillation of two scalars)
      // The oscillation between two representations IS the additional dimension
      const orbit = ellipticalOrbitPrimes(orbitalPrimes[0], orbitalPrimes[1], n, horizon);
      
      // Apply all corrections including orbital stabilization
      // The representation oscillation (flipping between views) creates the stabilizing effect
      // The 3D oscillation (x, y, z) provides the geometric structure
      const representationStabilizer = 1.0 + (orbit.representation === 1 ? 0.05 : -0.05); // Flip stabilization
      const oscillation3DStabilizer = 1.0 + (orbit.oscillation3D.x + orbit.oscillation3D.y + orbit.oscillation3D.z) * 0.05;
      const orbitalStabilizer = 1.0 + (orbit.orbitalRadius - 1.0) * 0.1; // Normalize orbital effect
      
      // Combine all stabilizers - the oscillation IS the dimension
      const correctedASym = aSym * avgAnchorCorrection * quadraticScalar * orbitalStabilizer * representationStabilizer * oscillation3DStabilizer;
      const delta = beta * correctedASym * Z * (1.0 + dimCorrection * 0.1);
      
      p = p * (1 + delta);
      points.push(toQ8(p));
    }
    
    stabilizedProjections.push({
      tower: tower.primes,
      pointsQ8: points,
      anchorDimensions: anchors.map(a => a.index),
      driftCorrections: driftScalars,
      skewCorrections: skewScalars,
      quadraticScalar,
      orbitalPrimes
    });
  }
  
  // Create graphs in memory from all projections
  // Each projection line becomes a graph representation
  const projectionGraphs = stabilizedProjections.map(proj => 
    createProjectionGraph(proj.pointsQ8, proj.tower, horizon)
  );
  
  // Meta-recursive anchor analysis
  // Analyze anchors from each graph, then recursively analyze those anchors
  // This captures the additional oscillation dimension
  const metaAnalysis = metaRecursiveAnchorAnalysis(projectionGraphs, 2);
  
  // Apply meta-anchor corrections to projections
  const metaCorrectedProjections = stabilizedProjections.map((proj, idx) => {
    const graph = projectionGraphs[idx];
    const graphAnchors = extractGraphAnchors(graph);
    
    // Find relevant meta-anchors for this graph
    const relevantMetaAnchors = metaAnalysis.metaAnchors.filter(ma => 
      ma.primaryGraph === idx || ma.similarAnchors.some(sa => sa.graphIndex === idx)
    );
    
    // Apply meta-corrections
    let metaCorrection = 1.0;
    if (relevantMetaAnchors.length > 0) {
      const avgMetaStability = relevantMetaAnchors.reduce((sum, ma) => sum + ma.metaStability, 0) / relevantMetaAnchors.length;
      metaCorrection = 1.0 + (avgMetaStability - 1.0) * 0.05; // Normalize meta-correction
    }
    
    // Apply meta-oscillation correction
    const metaOsc = metaAnalysis.metaOscillation;
    const avgMetaOsc = metaOsc.reduce((sum, m) => sum + m.oscillation, 0) / metaOsc.length;
    const metaOscCorrection = 1.0 + avgMetaOsc * 0.1;
    
    // Recalculate points with meta-corrections
    const metaCorrectedPoints = proj.pointsQ8.map((q8, n) => {
      const price = q8 / 256.0;
      const corrected = price * metaCorrection * metaOscCorrection;
      return toQ8(corrected);
    });
    
    return {
      ...proj,
      pointsQ8: metaCorrectedPoints,
      graphAnchors: graphAnchors.slice(0, 3), // Top 3 anchors
      metaCorrection,
      metaOscCorrection
    };
  });
  
  return {
    stabilizedProjections: metaCorrectedProjections,
    anchors: anchors.map(a => ({ dimension: a.index, phi: a.phi, stability: 1.0 / (a.stdDev + 1e-10) })),
    oscillationMetrics: oscillationAnalysis,
    orbitalPrimes,
    metaAnalysis: {
      metaAnchors: metaAnalysis.metaAnchors.slice(0, 10),
      metaOscillation: metaAnalysis.metaOscillation.slice(0, 50), // Sample
      deeperAnalysis: metaAnalysis.deeperAnalysis || null
    }
  };
}

// Fixed-point Q8 truncation helpers (all results truncated to Q8)
const Q8 = 1 << 8; // 256
function toQ8(xFloat) {
  // truncate (not round) to Q8
  const scaled = Math.trunc(xFloat * Q8);
  return scaled; // integer
}

function fromQ8(q8int) {
  return q8int / Q8;
}

// Generate default triads near a given prime depth pDepth
// We build 11–13 triads centered around pDepth using neighbors in the prime list.
function generateTriadsAroundPrime(pDepth, count, primes) {
  const idx = primes.indexOf(pDepth);
  if (idx === -1) throw new Error(`Depth prime ${pDepth} not in primes list`);
  const triads = [];
  const half = Math.floor(count / 2);
  for (let offset = -half; offset <= half; offset++) {
    if (triads.length >= count) break;
    const i = Math.max(0, Math.min(primes.length - 3, idx + offset));
    // triadic set: [p[i], p[i+1], p[i+2]]
    triads.push([primes[i], primes[i + 1], primes[i + 2]]);
  }
  return triads;
}

// Quick sieve for first N primes (You can replace this with a hard-coded 500 primes list if desired)
function firstNPrimes(N = 500) {
  const limit = 4000; // enough to get ~550 primes
  const sieve = new Uint8Array(limit + 1);
  const primes = [];
  for (let i = 2; i <= limit; i++) {
    if (!sieve[i]) {
      primes.push(i);
      for (let j = i * 2; j <= limit; j += i) sieve[j] = 1;
    }
    if (primes.length >= N) break;
  }
  return primes;
}

const PRIMES_500 = firstNPrimes(500);

// Test endpoint to verify routing is working (register directly, not via registerApiRoute)
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'API routing is working!', path: req.path, url: req.url, timestamp: new Date().toISOString() });
});
app.get('/trading/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'API routing is working!', path: req.path, url: req.url, timestamp: new Date().toISOString() });
});
console.log('✓ Registered test endpoints: GET /api/test and GET /trading/api/test');

// Yahoo Finance data endpoints
// Note: registerApiRoute function is defined earlier in the file
// IMPORTANT: These routes are registered BEFORE static middleware (which is at the end of the file)
registerApiRoute('get', '/api/quote', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    
    // Validate symbol format (alphanumeric, 1-10 characters)
    const symbolPattern = /^[A-Z0-9.-]{1,10}$/i;
    if (!symbolPattern.test(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format. Use 1-10 alphanumeric characters.' });
    }
    
    const quotes = await yahooFinance.quote(symbol.toUpperCase());
    const quote = Array.isArray(quotes) && quotes.length > 0 ? quotes[0] : quotes;
    res.json(quote);
  } catch (err) {
    console.error('Quote error:', err);
    // Handle yahoo-finance2 specific errors
    if (err.message && (err.message.includes('string did not match') || err.message.includes('expected pattern'))) {
      return res.status(400).json({ error: 'Invalid stock symbol. Please check the symbol and try again.' });
    }
    res.status(500).json({ error: 'quote failed', details: err.message });
  }
});

registerApiRoute('get', '/api/history', async (req, res) => {
  try {
    const { symbol, range = '1mo', interval = '1d' } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    
    // Validate symbol format
    const symbolPattern = /^[A-Z0-9.-]{1,10}$/i;
    if (!symbolPattern.test(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format. Use 1-10 alphanumeric characters.' });
    }
    
    // Use historical module for historical data
    // Calculate date ranges
    const now = Date.now();
    const rangeDays = {
      '1mo': 30,
      '3mo': 90,
      '1y': 365,
      '5d': 5
    };
    const days = rangeDays[range] || 30;
    const startDate = new Date(now - days * 24 * 60 * 60 * 1000);
    const endDate = new Date(now);
    
    // Use historical if available, otherwise return mock structure
    try {
      // Try to use historical module
      if (typeof yahooFinance.historical === 'function') {
        const result = await yahooFinance.historical(symbol.toUpperCase(), {
          period1: Math.floor(startDate.getTime() / 1000),
          period2: Math.floor(endDate.getTime() / 1000),
          interval: interval === '1d' ? '1d' : '1d'
        });
        
        // Transform to expected format
        const timestamps = result.map(d => new Date(d.date).getTime() / 1000);
        const closes = result.map(d => d.close);
        
        res.json({
          result: [{
            timestamp: timestamps,
            indicators: {
              quote: [{
                close: closes
              }]
            }
          }]
        });
        return;
      }
    } catch (histErr) {
      console.warn('Historical module error:', histErr.message);
      // If it's a validation error, return it immediately
      if (histErr.message && (histErr.message.includes('string did not match') || histErr.message.includes('expected pattern'))) {
        return res.status(400).json({ error: 'Invalid stock symbol. Please check the symbol and try again.' });
      }
    }
    
    // Fallback: return current quote as a single data point
    let price = 0;
    try {
      const quotes = await yahooFinance.quote(symbol.toUpperCase());
      const quote = Array.isArray(quotes) && quotes.length > 0 ? quotes[0] : quotes;
      price = quote?.regularMarketPrice || 0;
    } catch (quoteErr) {
      console.error('Quote error in history fallback:', quoteErr);
      if (quoteErr.message && (quoteErr.message.includes('string did not match') || quoteErr.message.includes('expected pattern'))) {
        return res.status(400).json({ error: 'Invalid stock symbol. Please check the symbol and try again.' });
      }
      // If quote fails, return empty data instead of throwing
      price = 0;
    }
    
    res.json({
      result: [{
        timestamp: [Math.floor(Date.now() / 1000)],
        indicators: {
          quote: [{
            close: [price]
          }]
        }
      }]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'history failed', details: err.message });
  }
});

// Enhanced tetration projection endpoint with oscillation analysis
registerApiRoute('post', '/api/tetration-projection', async (req, res) => {
  try {
    const {
      symbol,
      base = 3,
      depthPrime = 31,
      horizon = 240,
      count = 12,
      beta = 0.01,
      towerHeight = null // Tower height/depth (null = auto-calculate based on available primes)
    } = req.body || {};

    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    
    // Validate symbol format
    const symbolPattern = /^[A-Z0-9.-]{1,10}$/i;
    if (!symbolPattern.test(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format. Use 1-10 alphanumeric characters.' });
    }
    
    if (!Number.isInteger(+count) || +count < 1 || +count > 12) return res.status(400).json({ error: 'count must be between 1 and 12' });

    // Get latest price
    let lastPrice;
    try {
      const quotes = await yahooFinance.quote(symbol.toUpperCase());
      const quote = Array.isArray(quotes) && quotes.length > 0 ? quotes[0] : quotes;
      const lastTrade = quote?.regularMarketPrice ?? quote?.postMarketPrice ?? quote?.preMarketPrice;
      if (lastTrade == null) return res.status(500).json({ error: 'no market price available' });
      lastPrice = Number(lastTrade);
    } catch (quoteErr) {
      console.error('Quote error in tetration-projection:', quoteErr);
      if (quoteErr.message && (quoteErr.message.includes('string did not match') || quoteErr.message.includes('expected pattern'))) {
        return res.status(400).json({ error: 'Invalid stock symbol. Please check the symbol and try again.' });
      }
      throw quoteErr;
    }

    // Generate tetration towers with variable height (tower height = dimensions)
    // Returns towers and orbital primes (the two primes in elliptical orbit)
    const { towers, orbitalPrimes } = generateTetrationTowers(base, depthPrime, count, PRIMES_500, towerHeight, horizon);

    // Analyze dimensional oscillations
    // Note: Tower height levels ARE the additional dimensions, not the PHI dimensions
    // The PHI dimensions are used for the lattice oscillator, while tower height
    // represents the dimensional depth of the tetration structure
    // The orbital primes create the 3D oscillation of two scalars (the missing dimension)
    const oscillationAnalysis = analyzeDimensionalOscillation(horizon);

    // Perform recursive reassessment with oscillation anchors and orbital primes
    const reassessment = recursiveReassessment(
      lastPrice,
      towers,
      oscillationAnalysis,
      beta,
      horizon,
      base,
      orbitalPrimes
    );
    
    // Analyze cymatic patterns and detect nodes
    const cymaticAnalysis = analyzeCymaticPattern(
      reassessment.stabilizedProjections,
      PRIMES_500,
      horizon
    );
    
    // Detect prime nodes (kissing sphere relationships)
    const primeNodes = detectPrimeNodes(towers, PRIMES_500);
    
    // Isolate 2D oscillation and secondary prime oscillation for each projection
    const oscillationAnalysis2D = reassessment.stabilizedProjections.map(proj => {
      const prices = proj.pointsQ8.map(q8 => q8 / 256.0);
      const oscillation2D = isolate2DOscillation(prices);
      const secondaryPrime = isolateSecondaryPrimeOscillation(prices, PRIMES_500);
      return {
        tower: proj.tower,
        oscillation2D,
        secondaryPrime
      };
    });

    // Format response
    const lines = reassessment.stabilizedProjections.map((proj, i) => ({
      tower: proj.tower,
      towerLevels: towers[i].levels, // Primes organized by level
      towerHeight: towers[i].height,  // Height = dimensional depth
      base,
      aQ8: (towers[i].amplitude >> Q_FRAC_BITS).toString(), // Initial amplitude
      pointsQ8: proj.pointsQ8,
      anchorDimensions: proj.anchorDimensions,
      driftCorrections: proj.driftCorrections,
      skewCorrections: proj.skewCorrections,
      quadraticScalar: proj.quadraticScalar,
      orbitalPrimes: proj.orbitalPrimes // The two primes in elliptical orbit
    }));

    // Calculate average tower height for reporting
    const avgTowerHeight = towers.reduce((sum, t) => sum + t.height, 0) / towers.length;

    res.json({
      symbol,
      lastPriceQ8: toQ8(lastPrice),
      beta,
      horizon,
      primesDepthUsed: depthPrime,
      towerHeight: avgTowerHeight, // Average tower height (dimensional depth)
      orbitalPrimes: reassessment.orbitalPrimes, // The two primes in elliptical orbit (the missing dimension)
      phi: PHI,
      lines,
      oscillationAnalysis: {
        anchors: reassessment.anchors,
        quadraticPattern: oscillationAnalysis.quadraticPattern,
        entropy: oscillationAnalysis.entropy,
        aggregateVariance: oscillationAnalysis.aggregateVariance,
        dominantFrequencies: oscillationAnalysis.dominantFrequencies,
        dimensionalMetrics: oscillationAnalysis.dimensionalMetrics.map(m => ({
          dimension: m.dimension,
          phi: m.phi,
          drift: m.drift,
          skew: m.skew,
          zeroCrossings: m.zeroCrossings
        }))
      },
      metaAnalysis: {
        metaAnchorsCount: reassessment.metaAnalysis.metaAnchors.length,
        metaOscillationAvg: reassessment.metaAnalysis.metaOscillation.length > 0 
          ? reassessment.metaAnalysis.metaOscillation.reduce((sum, m) => sum + m.oscillation, 0) / reassessment.metaAnalysis.metaOscillation.length 
          : 0,
        hasDeeperAnalysis: reassessment.metaAnalysis.deeperAnalysis !== null
      },
      cymaticAnalysis: {
        commonFactors: cymaticAnalysis.commonFactors,
        radialNodes: cymaticAnalysis.cymaticData.map(c => ({
          projectionIndex: c.projectionIndex,
          radialNodeCount: c.radial.radialNodes.length,
          dominantFrequencies: c.frequencies
        }))
      },
      primeNodes: primeNodes.slice(0, 20), // Top 20 nodes
      oscillation2D: oscillationAnalysis2D.map(o => ({
        tower: o.tower,
        dominantFrequency: o.oscillation2D.dominantFrequency,
        dominantMagnitude: o.oscillation2D.dominantMagnitude
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'tetration projection failed', details: err.message });
  }
});

// Snapshot endpoint
registerApiRoute('post', '/api/snapshot', async (req, res) => {
  try {
    const {
      symbol,
      base = 3, // seed base, default 3
      triads, // array of triads [[p1,p2,p3], ...]
      depthPrime = 31, // default depth prime
      horizon = 240, // future steps
      count = 12, // number of projection lines (1-12)
      beta = 0.01 // calibration factor
    } = req.body || {};

    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    
    // Validate symbol format
    const symbolPattern = /^[A-Z0-9.-]{1,10}$/i;
    if (!symbolPattern.test(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format. Use 1-10 alphanumeric characters.' });
    }
    
    if (!Number.isInteger(+count) || +count < 1 || +count > 12) return res.status(400).json({ error: 'count must be between 1 and 12' });

    // Get latest price as seed for projections
    let lastPrice;
    try {
      const quotes = await yahooFinance.quote(symbol.toUpperCase());
      const quote = Array.isArray(quotes) && quotes.length > 0 ? quotes[0] : quotes;
      const lastTrade = quote?.regularMarketPrice ?? quote?.postMarketPrice ?? quote?.preMarketPrice;
      if (lastTrade == null) return res.status(500).json({ error: 'no market price available' });
      lastPrice = Number(lastTrade);
    } catch (quoteErr) {
      console.error('Quote error in snapshot:', quoteErr);
      if (quoteErr.message && (quoteErr.message.includes('string did not match') || quoteErr.message.includes('expected pattern'))) {
        return res.status(400).json({ error: 'Invalid stock symbol. Please check the symbol and try again.' });
      }
      throw quoteErr;
    }

    // Triads setup
    let triadList = triads;
    if (!Array.isArray(triadList) || triadList.length === 0) {
      triadList = generateTriadsAroundPrime(depthPrime, count, PRIMES_500);
    } else {
      // sanitize triads to exact count, 3 primes each
      triadList = triadList.filter(t => Array.isArray(t) && t.length === 3).slice(0, count);
      if (triadList.length < count) {
        const filler = generateTriadsAroundPrime(depthPrime, count - triadList.length, PRIMES_500);
        triadList = triadList.concat(filler);
      }
    }

    // Build projections
    const lines = [];
    for (let li = 0; li < triadList.length; li++) {
      const triad = triadList[li];
      const A72 = amplitudeFromTriad(base, triad);
      const aSym = amplitudeToSymmetric(A72); // [-1,1)

      // Compute ΔP(n) & projection P̂(n)
      let p = lastPrice;
      const q8Points = [];
      let prev = null;
      let zeroCross = 0;
      let extrema = 0;

      for (let n = 1; n <= horizon; n++) {
        const Z = latticeOscillatorZ(n);
        const delta = beta * aSym * Z; // small fractional change
        p = p * (1 + delta);
        const q8 = toQ8(p);
        q8Points.push(q8);

        // Oscillation stats (simple zero-cross of Z and turning points on delta)
        if (n > 1) {
          const prevZ = latticeOscillatorZ(n - 1);
          if ((Z > 0 && prevZ <= 0) || (Z < 0 && prevZ >= 0)) zeroCross++;
          if (prev != null) {
            const prevDelta = (p - prev) / Math.max(prev, 1e-9);
            const currDelta = delta;
            // crude turning point when sign of change in delta flips
            if (Math.sign(prevDelta) !== Math.sign(currDelta)) extrema++;
          }
        }
        prev = p;
      }

      lines.push({
        triad, // [p1, p2, p3]
        base, // 2 or 3
        aQ8: (A72 >> Q_FRAC_BITS).toString(), // truncated amplitude (as string to preserve BigInt)
        pointsQ8: q8Points, // projected prices in Q8 integers, truncated
        zeroCrossings: zeroCross,
        turningPoints: extrema
      });
    }

    res.json({
      symbol,
      lastPriceQ8: toQ8(lastPrice),
      beta,
      horizon,
      primesDepthUsed: depthPrime,
      phi: PHI,
      lines
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'snapshot failed' });
  }
});

// Serve static files AFTER API routes are registered
// This ensures API routes are matched before static file middleware
app.use('/node_modules', express.static(join(__dirname, 'node_modules')));
app.use('/trading/node_modules', express.static(join(__dirname, 'node_modules')));
app.use(express.static(__dirname));
app.use('/trading', express.static(__dirname));

// 404 handler for unmatched routes (must be last)
app.use((req, res) => {
  console.log(`\n[404 ERROR] ========================================`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Path: ${req.path}`);
  console.log(`OriginalUrl: ${req.originalUrl}`);
  console.log(`BaseUrl: ${req.baseUrl}`);
  console.log(`Available routes should be:`);
  console.log(`  GET /api/quote`);
  console.log(`  GET /api/history`);
  console.log(`  POST /api/tetration-projection`);
  console.log(`  POST /api/snapshot`);
  console.log(`  And all with /trading prefix`);
  console.log(`========================================\n`);
  
  res.status(404).json({ 
    error: 'Not Found', 
    message: `The requested URL ${req.url} was not found on this server.`,
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    hint: 'Check server console logs for registered routes'
  });
});

function startServer(port) {
  // Log all registered routes before starting server
  console.log('\n=== REGISTERED ROUTES ===');
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods)[0].toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(`${Object.keys(handler.route.methods)[0].toUpperCase()} ${handler.route.path}`);
        }
      });
    }
  });
  routes.forEach(route => console.log(`  ${route}`));
  console.log('========================\n');
  
  const server = app.listen(port, () => {
    console.log(`\n🚀 Server running on http://localhost:${port}`);
    console.log(`📄 Open http://localhost:${port}/index.html in your browser`);
    console.log(`🔌 API routes available at /api/* and /trading/api/*`);
    console.log(`\nWaiting for requests...\n`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
  
  return server;
}

const PORT = process.env.PORT || 8080;
startServer(PORT);

