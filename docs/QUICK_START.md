# Quick Start Guide

## Start the Web App

1. **Install dependencies** (first time only):
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```
   
   Or use the startup script:
   ```bash
   ./start.sh
   ```

3. **Open in your browser**:
   ```
   http://localhost:8080/index.html
   ```

## Default Port

- **Port 8080** is the default port
- If port 8080 is in use, the server will automatically try **8081, 8082**, etc.
- You can also set a custom port:
  ```bash
  PORT=3002 npm start
  ```

## Troubleshooting

### Server won't start
- Make sure Node.js 18+ is installed: `node --version`
- Check if the port is already in use: `lsof -ti:8080`
- Kill any existing server: `lsof -ti:8080 | xargs kill -9`

### API errors
- Yahoo Finance API is unofficial and may have rate limits
- Wait a moment and try again if you see errors
- Check the browser console (F12) for error messages

### Port issues
- The server automatically tries the next port if the default is in use
- Check the console output for the actual port number
- The frontend uses dynamic URLs, so it will work on any port

## Test the API

Test if the server is working:
```bash
curl http://localhost:8080/api/quote?symbol=AAPL
```

If you see JSON data, the server is working correctly!




