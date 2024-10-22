const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bodyParser = require('body-parser');
const url = require('url');

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
  if (!/^https?:\/\
    return res.status(400).send('Invalid URL. Please include http:// or https://');
  }

  res.redirect(`/proxy?url=${encodeURIComponent(targetUrl)}`);
});

const rewriteHtml = (body, targetUrl) => {

  return body.replace(/(href|src)="(\/[^"]*)"/g, (match, p1, p2) => {
    return `${p1}="/proxy?url=${encodeURIComponent(targetUrl + p2)}"`;
  });
};

app.use('/proxy', (req, res, next) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('No URL provided.');
  }

  const parsedUrl = url.parse(targetUrl);

  const proxy = createProxyMiddleware({
    target: `${parsedUrl.protocol}
    changeOrigin: true,
    selfHandleResponse: true, 
    onProxyRes: (proxyRes, req, res) => {
      const contentType = proxyRes.headers['content-type'] || '';
      let body = Buffer.from([]);

      proxyRes.on('data', (chunk) => {
        body = Buffer.concat([body, chunk]);
      });

      proxyRes.on('end', () => {
        if (contentType.includes('text/html')) {
          let html = body.toString();

          html = rewriteHtml(html, targetUrl);
          res.setHeader('content-type', 'text/html');
          res.send(html);
        } else {

          res.setHeader('content-type', contentType);
          res.send(body);
        }
      });
    },
    pathRewrite: {
      '^/proxy': '', 
    },
  });

  proxy(req, res, next); 
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http:
});
