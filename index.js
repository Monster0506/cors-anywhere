const express = require("express");
const corsAnywhere = require("cors-anywhere");
const { URL } = require("url");

const app = express();

// Set up CORS Anywhere
const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 3000;

// Middleware for logging incoming requests
app.use((req, res, next) => {
  console.log("Received request:", req.method, req.url);
  console.log("Headers:", req.headers);
  next();
});

// Proxy endpoint
app.get("/api/*", (req, res) => {
  try {
    // Extract the target URL from the request
    const targetUrl = req.url.replace("/api/", "");
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

    // Create the proxy server
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
app.listen(port, () => {
  console.log(`CORS Anywhere proxy is running on ${host}:${port}`);
});
