const express = require("express");
const corsAnywhere = require("cors-anywhere");
const axios = require("axios");
const marked = require("marked");
const app = express();
const port = process.env.PORT || 3000;

// Configure marked options for secure HTML conversion
marked.setOptions({
  headerIds: false,
  mangle: false,
  breaks: true,
  sanitize: true,
});

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

// Helper function to convert markdown to simple HTML
function createHtmlDocument(markdown) {
  console.log("Creating HTML document from markdown");
  // Extract only the markdown content
  const markdownContent = markdown.split("Markdown Content:")[1];
  console.log("Extracted markdown content:", markdownContent);

  // Convert to HTML and wrap in a div
  const htmlContent = marked.parse(markdownContent || markdown);
  console.log("Converted HTML content:", htmlContent);
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Documentation</title>
    </head>
    <body>
        <div>${htmlContent}</div>
    </body>
    </html>
  `;
}

// New endpoint to handle Jina API requests
app.get("/jina/*", async (req, res) => {
  try {
    console.log("Received request at /jina endpoint");
    // Extract the target URL from the request path
    const targetUrl = req.url.replace("/jina/", "");
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    console.log("Fetching from Jina API:", jinaUrl);

    // Fetch content from Jina API
    const response = await axios.get(jinaUrl, {
      headers: {
        Accept: "text/markdown",
        "User-Agent": "Node.js Proxy",
      },
    });

    console.log(
      "Received response from Jina API with status:",
      response.status,
    );
    console.log("Response data:", response.data);

    // Convert markdown to HTML
    const htmlDocument = createHtmlDocument(response.data);

    // Send HTML response
    res.setHeader("Content-Type", "text/html");
    res.send(htmlDocument);

    console.log("Successfully processed Jina API request");
  } catch (error) {
    console.error("Error processing Jina API request:", error);
    res.status(500).send(`
      <html>
        <body>
          <div>Error: Failed to fetch and convert content: ${error.message}</div>
        </body>
      </html>
    `);
  }
});

// Original CORS Anywhere proxy endpoint
app.get("/api/*", (req, res) => {
  console.log("Received request at /api endpoint");
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
  console.log(`Running proxy server on port ${port}`);
});
