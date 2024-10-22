const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bodyParser = require('body-parser');
const url = require('url');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <form method="POST" action="/unblock">
      <label for="url">Enter URL:</label>
      <input type="text" placeholder="https://google.com" name="url" id="url" required>
      <button type="submit">Go</button>
    </form>
  `);
});

app.post('/unblock', (req, res) => {
  const targetUrl = req.body.url;
  if (!/^https?:\/\//.test(targetUrl)) {
    return res.status(400).send('Invalid URL. Please include http:// or https://');
  }

  res.redirect(`/proxy?url=${encodeURIComponent(targetUrl)}`);
});

app.use('/proxy', (req, res, next) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('No URL provided.');
  }

  const parsedUrl = url.parse(targetUrl);

  const proxy = createProxyMiddleware({
    target: `${parsedUrl.protocol}//${parsedUrl.host}`,
    changeOrigin: true,
    pathRewrite: {
      '^/proxy': '',
    },
    logLevel: 'debug',
  });

  proxy(req, res, next);
});

const port = process.env.PORT;
const host = process.env.HOST ;

app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});
