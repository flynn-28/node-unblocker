const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bodyParser = require('body-parser');
const url = require('url');
const responseRewrite = require('response-rewrite');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <form method="POST" action="/browse">
      <label for="url">Enter URL to unblock:</label>
      <input type="text" name="url" id="url" required>
      <button type="submit">Go</button>
    </form>
  `);
});

app.post('/browse', (req, res) => {
  const targetUrl = req.body.url;
  if (!/^https?:\/\//.test(targetUrl)) {
    return res.status(400).send('Invalid URL. Please include http:// or https://');
  }

  res.redirect(`/proxy?url=${encodeURIComponent(targetUrl)}`);
});

const rewriteUrls = (proxyRes, req, res) => {
  const contentType = proxyRes.headers['content-type'] || '';
  if (contentType.includes('text/html')) {
    let buffer = [];
    proxyRes.on('data', (chunk) => buffer.push(chunk));
    proxyRes.on('end', () => {
      let body = Buffer.concat(buffer).toString();
      
      body = body.replace(/(href|src)="(\/[^"]*)"/g, (match, p1, p2) => {
        return `${p1}="/proxy?url=${encodeURIComponent(req.query.url)}${p2}"`;
      });

      res.setHeader('content-type', 'text/html');
      res.send(body);
    });
  }
};

app.use('/proxy', (req, res, next) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('No URL provided.');
  }

  const parsedUrl = url.parse(targetUrl);

  const proxy = createProxyMiddleware({
    target: `${parsedUrl.protocol}//${parsedUrl.host}`,
    changeOrigin: true,
    selfHandleResponse: true, 
    onProxyRes: (proxyRes, req, res) => {
      rewriteUrls(proxyRes, req, res);
    },
    pathRewrite: {
      '^/proxy': '', 
    },
    logLevel: 'debug',
  });

  proxy(req, res, next); 
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
