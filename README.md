# Capitol Outdoor Interactive Map

Interactive mapping tool for showcasing Capitol Outdoor's OOH advertising inventory.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your Google Maps API key:
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and add your API key.

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Build for Production

```bash
npm run build
```

Static files will be in the `out/` folder. Deploy to Netlify, S3, or any static host.

## Features

- Interactive Google Map with all advertising units
- Click markers to view unit details and images
- Select units for client proposals
- Generate shareable links with selected units
- Filter by market
- Direct Street View links

## Adding Inventory Data

Edit `data/inventory.json` to add or update units. Each unit needs:
- Unique ID
- Name and address
- Coordinates (lat/lng)
- Type, size, facing direction
- Daily impressions
- Image path
- Street View heading

## Support

Contact: [Your contact info]
