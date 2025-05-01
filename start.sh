cd D:/taichinhcanhan/nestjs-base && npm run build 
pm2 start node --name "app" --cwd "D:\\taichinhcanhan\\nestjs-base\\dist" -- main.js
pm2 start "cloudflared" --name "cloudflared" -- tunnel run api
