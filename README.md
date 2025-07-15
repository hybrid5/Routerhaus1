# RouterHaus – Static Site Setup

## Rebuild Tailwind
Run the Tailwind CLI to compile styles into `docs/main.css`:
```bash
./tailwindcss -i build/input.css -o docs/main.css --minify
```

## Preview Locally
Serve the `docs/` folder using any static server:
```bash
npx serve docs
# or
python -m http.server -d docs
```

## Structure
- `components/` – Shared HTML (e.g. header, footer)
- `pages/` – Kits, about, consult, contact, etc.
- `blog/` – Blog index + posts
- `styles.css` – Custom styles (non-Tailwind)
- `assets/css/main.css` – Tailwind build output

## Notes
- This repository is intentionally unlicensed.
- Do **not** edit `index.html` unless prompted—Codex may manage it.
- All other files are safe to modify.
