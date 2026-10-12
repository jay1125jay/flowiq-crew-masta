FROM node:22-alpine
WORKDIR /app
COPY beltrix-worker/worker.mjs ./worker.mjs
ENV NODE_ENV=production
CMD ["node","worker.mjs"]
