import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// This is a placeholder to make the typechecker happy
// it's never called in production
export async function setupVite(_app: Express, _server: Server) {
  throw new Error("setupVite should not be called in production");
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  // Check if directory exists, if not create it
  if (!fs.existsSync(distPath)) {
    console.log(`Creating dist/public directory: ${distPath}`);
    fs.mkdirSync(distPath, { recursive: true });
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.get("*", (_req, res) => {
    // Create a simple HTML file if it doesn't exist
    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      console.log(`Creating basic index.html in ${indexPath}`);
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>WorkBook App - API Server</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #333; }
    .container { max-width: 800px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>WorkBook API Server</h1>
    <p>This is the API server for the WorkBook application.</p>
    <p>The frontend client is not available in this production build.</p>
  </div>
</body>
</html>`;
      fs.writeFileSync(indexPath, html);
    }
    res.sendFile(indexPath);
  });
}
