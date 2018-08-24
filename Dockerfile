FROM buildkite/puppeteer:v1.6.2
WORKDIR /code/
COPY package*.json ./
RUN npm i > /dev/null
COPY . .
EXPOSE 3000
CMD npm start

