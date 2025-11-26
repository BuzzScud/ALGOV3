# CSS Directory

This directory contains the compiled Tailwind CSS file.

## File: `tailwind.css`

- **Size**: ~37KB (minified)
- **Source**: Built from `../input.css`
- **Build Command**: `npm run build:css`

## Building the CSS File

If the CSS file is missing or needs to be rebuilt:

```bash
# From project root
npm run build:css

# OR directly
cd frontend
npx tailwindcss -i ./input.css -o ./css/tailwind.css --minify
```

## Production Deployment

The CSS file must be built on the production server:

```bash
cd /var/www/html/trading
npx tailwindcss -i ./input.css -o ./css/tailwind.css --minify
sudo chmod 644 css/tailwind.css
sudo chown apache:apache css/tailwind.css
```

## Status

✅ File is tracked in Git
✅ File is 37KB (properly built)
✅ File is referenced in `index.html`

