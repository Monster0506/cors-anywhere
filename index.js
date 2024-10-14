const express = require("express");
const corsAnywhere = require("cors-anywhere");

const app = express();
const port = process.env.PORT || 3000;

// CORS Anywhere options
const corsOptions = {
  originWhitelist: [], // Allow all origins
  requireHeader: ["origin", "x-requested-with"],
  removeHeaders: ["cookie", "cookie2"],
  setHeaders: {
    "x-powered-by": "cors-anywhere-proxy",
  },
};

// Create a standalone CORS Anywhere server instance
const corsProxy = corsAnywhere.createServer(corsOptions);

// Express endpoint to handle proxy requests
app.get("/api/*", (req, res) => {
  // Extract the target URL from the request path
  const targetUrl = req.url.replace("/api/", "");

  // Log the incoming request details
  console.log("Received a request to proxy:");
  console.log("Original URL:", req.originalUrl);
  console.log("Decoded target URL:", targetUrl);
  console.log("Request method:", req.method);
  console.log("Request headers:", req.headers);

  // Log the request's origin details
  const requestIP = req.headers["x-forwarded-for"] || req.ip;
  console.log("Request IP:", requestIP);
  console.log("Request Hostname:", req.hostname);

  // Proxy the request using the standalone corsProxy instance
  try {
    req.url = "/" + decodeURIComponent(targetUrl);
    console.log("Proxying request to:", req.url);
    corsProxy.emit("request", req, res);
  } catch (error) {
    console.error("Error during proxying:", error);
    res.status(500).send("An error occurred while processing the request.");
  }

  // Log when the request is completed
  res.on("finish", () => {
    console.log("Request completed with status:", res.statusCode);
    console.log("Response headers:", res.getHeaders());
  });
});

// Start the server
app.listen(port, () => {
  console.log(`CORS Anywhere proxy is running on port ${port}`);
});
