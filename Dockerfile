FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=
ARG VITE_DEV_API_PROXY=http://127.0.0.1:8081
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_DEV_API_PROXY=${VITE_DEV_API_PROXY}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
