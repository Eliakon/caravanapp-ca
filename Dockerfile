# Dockerfile
FROM node:8.12.0
WORKDIR /app
ADD package.json yarn.lock ./
RUN yarn install
ADD . .
RUN yarn bootstrap
RUN CI=true yarn test
RUN yarn lint
RUN yarn build