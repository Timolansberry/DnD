const http = require("http");
const fs = require("fs");
const path = require("path");

const port = 5500;
const rootDir = __dirname;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(body);
}

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requestedPath = decoded === "/" ? "/index.html" : decoded;
  const normalized = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(rootDir, normalized);
}

const server = http.createServer((request, response) => {
  const filePath = safeFilePath(request.url || "/");

  if (!filePath.startsWith(rootDir)) {
    send(response, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      send(response, 404, "Not found");
      return;
    }

    const resolvedPath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    fs.readFile(resolvedPath, (readError, content) => {
      if (readError) {
        send(response, 404, "Not found");
        return;
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      send(response, 200, content, mimeTypes[ext] || "application/octet-stream");
    });
  });
});

server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Serving ${rootDir} at http://127.0.0.1:${port}`);
});
