FROM buildkite/puppeteer:v1.15.0
WORKDIR /code/
COPY package.json yarn.lock ./
RUN yarn
COPY . .
EXPOSE 3000
CMD yarn start

