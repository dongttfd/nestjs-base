# Build
- Run `cd <your-folder> && npm run build`
- Run `pm2 start node --name "app" --cwd <your-folder> -- main.js`
- Run `pm2 start "cloudflared" --name "cloudflared" -- tunnel run api`
