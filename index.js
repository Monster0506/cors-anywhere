const express = require("express");
const corsAnywhere = require("cors-anywhere");
const { URL } = require("url");

const app = express();
const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 3000;

// Middleware for logging incoming requests (Vercel-compatible)
app.use((req, res, next) => {
  if (process.env.VERCEL_ENV) {
    console.log("[VERCEL LOG] Received request:", req.method, req.url);
    console.log("[VERCEL LOG] Headers:", JSON.stringify(req.headers));
  } else {
    console.log("Received request:", req.method, req.url);
    console.log("Headers:", req.headers);
  }
  next();
});

// Proxy endpoint
app.use("/api/*", (req, res) => {
  try {
    // Extract the target URL from the request
    const targetUrl = req.url.replace(/^\/api\//, "");
    if (!targetUrl) {
      console.error("No target URL provided");
      return res.status(400).json({ error: "No target URL provided" });
    }
    const decodedUrl = decodeURIComponent(targetUrl);

    console.log("Decoded URL:", decodedUrl);

    // Validate the URL
    let parsedUrl;
    try {
      parsedUrl = new URL(decodedUrl);
    } catch (e) {
      console.error("Invalid URL:", decodedUrl);
      return res.status(400).json({ error: "Invalid URL" });
    }

    // Proxy the request using CORS Anywhere
    req.url = parsedUrl.pathname + parsedUrl.search;
    corsAnywhere.createServer({
      originWhitelist: [], // Allow all origins
      requireHeader: ["origin", "x-requested-with"],
      removeHeaders: ["cookie", "cookie2"],
      setHeaders: {
        "x-powered-by": "cors-anywhere-proxy",
      },
    })(req, res);
  } catch (error) {
    console.error("Error during proxying:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
app.listen(port, host, () => {
  console.log(`CORS Anywhere proxy is running on ${host}:${port}`);
});
