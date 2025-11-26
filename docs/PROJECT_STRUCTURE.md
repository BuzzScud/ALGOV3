# Project Structure

This project follows a clean, organized structure for better maintainability.

## Directory Structure

```
ALGOV3/
├── backend/              # Backend server code
│   ├── server.mjs        # Main Express server
│   ├── package.json      # Backend dependencies
│   └── ...
├── frontend/             # Frontend client code
│   ├── index.html        # Main HTML file
│   ├── css/              # Stylesheets
│   │   ├── styles.css    # Custom styles
│   │   └── tailwind.css  # Compiled Tailwind CSS
│   ├── js/               # JavaScript files
│   │   └── app.js        # Frontend application logic
│   ├── input.css         # Tailwind input file
│   └── tailwind.config.js # Tailwind configuration
├── docs/                 # Documentation files
│   ├── README.md
│   ├── INTEGRATION_GUIDE.md
│   └── ...
├── scripts/              # Utility scripts
│   ├── start.sh          # Start script
│   ├── setup-backend.sh  # Setup script
│   └── ...
├── package.json          # Root package.json (main dependencies)
├── node_modules/         # Dependencies
└── LICENSE              # License files
```

## Key Directories

### `/backend`
Contains the Express server and backend logic. The server serves static files from `/frontend` and handles API routes.

### `/frontend`
Contains all client-side code:
- HTML files
- CSS stylesheets
- JavaScript files
- Tailwind configuration

### `/docs`
All documentation and markdown files for reference and setup instructions.

### `/scripts`
Shell scripts and utility scripts for deployment, setup, and testing.

## Running the Application

```bash
# Start the server
./scripts/start.sh

# Or using npm
npm start
```

The server will start on `http://localhost:8080` and serve files from the `/frontend` directory.

## Building CSS

```bash
npm run build:css
```

This compiles Tailwind CSS from `frontend/input.css` to `frontend/css/tailwind.css`.

