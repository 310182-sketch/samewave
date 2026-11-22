import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDirectory = path.resolve(fileURLToPath(new URL("../site/", import.meta.url)));
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  const relativePath = (pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""))
    .replaceAll("/", path.sep);
  const requestedPath = path.resolve(siteDirectory, relativePath);
  if (requestedPath !== siteDirectory && !requestedPath.startsWith(siteDirectory + path.sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileInfo = await stat(requestedPath);
    if (!fileInfo.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
  } catch {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": contentTypes.get(path.extname(requestedPath).toLowerCase()) ||
      "application/octet-stream",
  });
  createReadStream(requestedPath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Samewave preview running at http://${host}:${port}/`);
});
