import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const OUT_DIR = path.resolve(process.cwd(), "out");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

if (!fs.existsSync(OUT_DIR)) {
  console.error(`❌ Static build directory not found: ${OUT_DIR}`);
  console.error(`Please run "npm run build" first to generate the static export.`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  // Normalize root path
  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  let filePath = path.join(OUT_DIR, pathname);

  // Clean URL resolution (e.g. /about -> /about.html or /about/index.html)
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + ".html")) {
      filePath = filePath + ".html";
    } else if (fs.existsSync(path.join(filePath, "index.html"))) {
      filePath = path.join(filePath, "index.html");
    }
  }

  // Prevent directory traversal attacks
  if (!filePath.startsWith(OUT_DIR)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const notFoundPath = path.join(OUT_DIR, "404.html");
      if (fs.existsSync(notFoundPath)) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        fs.createReadStream(notFoundPath).pipe(res);
      } else {
        res.statusCode = 404;
        res.end("Not Found");
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/ (serving ${OUT_DIR})`);
});
