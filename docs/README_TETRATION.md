# Prime Tetration Trading Web App

A trading web application that uses prime tetration projections to visualize potential price movements based on mathematical models using crystalline lattice oscillators and prime exponentiation towers.

## Features

- Real-time stock data via Yahoo Finance API
- Prime tetration projection calculations using 12-dimensional phonon lattice
- Interactive chart visualization with 11-13 projection lines
- Prime depth slider with prime number stops
- Fixed-point Q8 arithmetic with +8 bit guard bits

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server will run on `http://localhost:8080` and automatically serve the HTML file.
(If port 8080 is in use, it will automatically try 8081, 8082, etc.)

3. Open your browser and navigate to:
```
http://localhost:8080/index.html
```

Or use the startup script:
```bash
./start.sh
```

## Usage

1. Enter a stock ticker symbol (e.g., AAPL, TSLA, MSFT)
2. Select base seed (3 is preferred, 2 for Enigma-style)
3. Adjust the prime depth slider to select a prime depth (default: 31)
4. Choose number of projections (11, 12, or 13)
5. Set horizon (number of future steps, default: 240)
6. Adjust beta calibration factor (default: 0.01)
7. Click "Snapshot" to generate projections

## Mathematical Model

- **Dimensional frequencies (phonon list)**: [3, 7, 31, 12, 19, 5, 11, 13, 17, 23, 29, 31]
- **Lattice oscillator**: Aggregates all 12 dimensions into a single oscillator
- **Prime towers**: Uses triadic primes [p1, p2, p3] with base^(p2^p3) mod 2^72
- **Fixed-point arithmetic**: All calculations use BigInt with Q8 truncation (+8 guard bits)

## API Endpoints

- `GET /api/quote?symbol=TSLA` - Get current quote
- `GET /api/history?symbol=TSLA&range=1mo&interval=1d` - Get historical data
- `POST /api/snapshot` - Generate prime tetration projections

## Disclaimer

This tool is for research and visualization only; not financial advice.

The Yahoo Finance access used here relies on an unofficial approach via the yahoo-finance2 library and is subject to change or rate limits.

