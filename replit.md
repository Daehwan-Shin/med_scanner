# e약은요 Drug Finder (MFDS OpenAPI)

## Overview
Korean drug information search application using the MFDS (Ministry of Food and Drug Safety) e약은요 (Drug Overview Information) OpenAPI. The app provides automatic search with real-time results and detailed drug information display.

## Current State
- **Status**: Imported and configured for Replit environment
- **Port**: 5000 (frontend with Express backend)
- **Language**: Node.js 20
- **Framework**: Express.js with static frontend

## Required Secrets
This app requires the following secret to be configured in Replit Secrets:
- `MFDS_SERVICE_KEY`: API key from the Korean Public Data Portal (공공데이터포털)
  - Get your key at: https://www.data.go.kr/
  - Search for "의약품개요정보(e약은요)" service
  - Apply for API key access

## Project Structure
```
├── index.js              # Express server (backend)
├── kpic-api.js          # MFDS API integration module
├── public/
│   ├── index.html       # Main frontend page
│   ├── app.js          # Frontend JavaScript
│   └── styles.css      # UI styles
├── package.json         # Node.js dependencies
└── replit.md           # This file
```

## Features
- Real-time drug name search with 350ms debounce
- Automatic detail view for top search result
- Keyboard navigation (Arrow Up/Down, Enter)
- Displays: drug name, code, manufacturer, efficacy, dosage, warnings, interactions, side effects, storage

## API Endpoints
- `GET /api/health` - Health check
- `GET /api/search?name={drugName}` - Search drugs by name
- `GET /api/detail/:itemSeq` - Get detailed drug information

## Recent Changes
- **2025-11-05**: Initial import and Replit environment setup
  - Changed port from 3000 to 5000
  - Added 0.0.0.0 host binding for webview compatibility
  - Created .gitignore for Node.js
  - Installed dependencies
  - Configured workflow for automatic startup

## User Preferences
None set yet.
