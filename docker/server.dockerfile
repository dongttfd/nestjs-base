FROM node:22

WORKDIR /app

COPY . .

RUN npm install

RUN npx prisma generate

RUN npm run build

EXPOSE 80

CMD ["node", "dist/main.js"]
