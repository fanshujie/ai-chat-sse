# ---------- 阶段 1：装全量依赖 + 构建前端 ----------
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- 阶段 2：运行时，只带跑起来必需的东西 ----------
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server ./server
COPY data ./data

EXPOSE 3001
CMD ["npx", "tsx", "server/index.ts"]
