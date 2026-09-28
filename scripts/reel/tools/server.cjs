// tiny static server for the stage (localhost only)
const http = require("http"), fs = require("fs"), path = require("path");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".otf": "font/otf", ".ttf": "font/ttf", ".woff2": "font/woff2" };
module.exports = function serve(root, port) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
      if (!p.startsWith(root)) { rsp.writeHead(403); return rsp.end(); }
      fs.readFile(p, (err, buf) => {
        if (err) { rsp.writeHead(404); return rsp.end("nf " + req.url); }
        rsp.writeHead(200, { "content-type": TYPES[path.extname(p).toLowerCase()] || "application/octet-stream", "cache-control": "max-age=3600" });
        rsp.end(buf);
      });
    });
    srv.listen(port, "127.0.0.1", () => res(srv));
  });
};
