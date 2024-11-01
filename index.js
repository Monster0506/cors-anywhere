const express = require("express");
const axios = require("axios");
const marked = require("marked");
const app = express();
const port = process.env.PORT || 3000;

// Configure marked options for secure HTML conversion
marked.setOptions({
  headerIds: false,
  mangle: false,
  breaks: true,
});

// Helper function to convert markdown to simple HTML
function createHtmlDocument(markdown) {
  console.log("Creating HTML document from markdown");
  // Extract markdown content and convert it to HTML
  const markdownContent = markdown.split("Markdown Content:")[1] || markdown;
  const htmlContent = marked.parse(markdownContent);
  console.log("Converted HTML content:", htmlContent);
  return htmlContent;
}

// Function to handle proxy requests
async function handleProxyRequest(targetUrl, req, res) {
  try {
    console.log(`Proxying request to: ${targetUrl}`);
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
      data: req.body,
    });

    // Send the response data back to the client
    res.status(response.status).set(response.headers).send(response.data);
    console.log(
      `Request to ${targetUrl} completed with status: ${response.status}`,
    );
  } catch (error) {
    console.error(`Error proxying to ${targetUrl}:`, error.message);
    res.status(500).send("Error occurred while proxying request.");
  }
}

// New endpoint to handle Jina API requests
app.get("/jina/*", async (req, res) => {
  const targetPath = req.url.replace("/jina/", "");
  const targetUrl = `https://r.jina.ai/${targetPath}`;

  console.log("Processing /jina endpoint request");

  try {
    // Fetch the markdown content from Jina API
    const response = await axios.get(targetUrl, {
      headers: {
        Accept: "text/markdown, text/html",
        "User-Agent": "Custom Proxy",
      },
    });

    // Convert markdown to HTML and send the response
    const htmlDocument = createHtmlDocument(response.data);
    res.setHeader("Content-Type", "text/html").send(htmlDocument);
    console.log("Successfully processed and sent Jina API response");
  } catch (error) {
    console.error("Error processing Jina API request:", error.message);
    res.status(500).send(`Error fetching content: ${error.message}`);
  }
});

// General API proxy endpoint
app.get("/api/*", async (req, res) => {
  console.log("\n\n=== Incoming Request at /api Endpoint ===");
  console.log("Original URL:", req.originalUrl);

  // Clean and validate the target URL
  let targetUrl = req.url.replace("/api/", "");
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "http://" + targetUrl;
  }

  console.log("Validated Target URL:", targetUrl);

  // Handle the proxy request
  await handleProxyRequest(targetUrl, req, res);
  console.log("=== Request Completed ===\n");
});

// Start the server
app.listen(port, () => {
  console.log(`Running proxy server on port ${port}`);
});
