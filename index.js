const express = require("express");
const corsAnywhere = require("cors-anywhere");
const rateLimit = require("./lib/rate-limit");

const app = express();
const port = process.env.PORT || 3000;
const host = "0.0.0.0";

// CORS Anywhere options
const corsOptions = {
  originWhitelist: [], // Allow all origins
  requireHeader: ["origin", "x-requested-with"],
  removeHeaders: ["cookie", "cookie2"],
  setHeaders: {
    "x-powered-by": "cors-anywhere-proxy",
    "Access-Control-Allow-Origin": "*", // Ensure CORS header is set
  },
};

// Create a standalone CORS Anywhere server instance
const corsProxy = corsAnywhere.createServer(corsOptions);

// Function to log request details
function logRequestDetails(req, targetUrl) {
  console.log("Received a request to proxy:");
  console.log("Original URL:", req.originalUrl);
  console.log("Decoded target URL:", targetUrl);
  console.log("Request method:", req.method);
  console.log("Request headers:", req.headers);

  const requestIP = req.headers["x-forwarded-for"] || req.ip;
  console.log("Request IP:", requestIP);
  console.log("Request Hostname:", req.hostname);
}

// Express endpoint to handle /api/cors1 and /api/* proxy requests
app.use("/api/cors1/*", (req, res) => {
  // Extract the target URL from the request path
  const targetUrl = req.url.replace(/^\/api(?:\/cors1)?\//, "");

  // Log the incoming request details
  logRequestDetails(req, targetUrl);

  // Add CORS headers to response
  res.setHeader("Access-Control-Allow-Origin", "*");

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

// Express endpoint to handle /api/cors2 proxy requests using standalone CORS Anywhere instance
app.use(["/api/*", "/api/cors2"], (req, res) => {
  logRequestDetails(req, req.url);
  const targetUrl = req.url.replace(/^\/api(?:\/cors2)?\//, "");
  req.url = "/" + decodeURIComponent(targetUrl);
  corsProxy.emit("request", req, res);
});

// Start the Express server
app.listen(port, () => {
  console.log(`Express proxy endpoints are running on port ${port}`);
});

// Blacklist and whitelist setup
var originBlacklist = parseEnvList(process.env.CORSANYWHERE_BLACKLIST);
var originWhitelist = parseEnvList(process.env.CORSANYWHERE_WHITELIST);
function parseEnvList(env) {
  if (!env) {
    return [];
  }
  return env.split(",");
}

// Set up rate-limiting to avoid abuse of the public CORS Anywhere server.
var checkRateLimit = rateLimit(process.env.CORSANYWHERE_RATELIMIT);

// Start the standalone CORS Anywhere server behind /api/cors2
corsProxy.on("request", (req, res) => {
  corsProxy.emit("request", req, res);
});

corsProxy.on("error", (err, req, res) => {
  res.writeHead(404, { "Access-Control-Allow-Origin": "*" });
  res.end("Not found because of proxy error: " + err);
});
