FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY index.html vite.config.js ./
COPY src ./src
EXPOSE 5173
ENV API_PROXY_TARGET=http://backend:8000
CMD ["npm", "run", "dev"]
