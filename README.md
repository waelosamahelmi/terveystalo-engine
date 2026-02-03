# NØRR3 Marketing Engine

A comprehensive marketing campaign management dashboard for real estate agents.

## Features

- Campaign management with multi-channel support (Meta, Display, PDOOH)
- User management with role-based access control
- Real-time analytics and reporting
- Integration with Google Sheets for data synchronization
- Activity logging for audit trails

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Supabase (Authentication & Database)
- Chart.js for analytics
- Vite for development and building

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://your-repository-url.git
cd norr3-marketing-dashboard
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with the following variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_SHEET_ID=your_google_sheet_id
VITE_JSON_FEED_URL=your_json_feed_url
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret
VITE_GOOGLE_REFRESH_TOKEN=your_google_refresh_token
VITE_GOOGLE_REDIRECT_URI=your_google_redirect_uri
```

4. Start the development server
```bash
npm run dev
```

## Deployment

Build the application for production:
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

© 2025 NØRR3. All rights reserved.