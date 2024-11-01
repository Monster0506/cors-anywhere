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
  const markdownContent = markdown.split("Markdown Content:")[1] || markdown;
  const htmlContent = marked.parse(markdownContent);
  console.log("Converted HTML content:", htmlContent);
  return htmlContent;
}

// Function to handle proxy requests with redirect support
async function handleProxyRequest(targetUrl, req, res) {
  try {
    console.log(`Proxying request to: ${targetUrl}`);

    // Fetch the data with redirect handling enabled
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
      data: req.body,
      maxRedirects: 10, // Customize the max number of redirects if necessary
      validateStatus: (status) => status < 400, // Accept redirect statuses as valid
    });

    // Send the response data back to the client
    res.status(response.status).set(response.headers).send(response.data);
    console.log(
      `Request to ${targetUrl} completed with status: ${response.status}`,
    );
  } catch (error) {
    if (error.response) {
      console.error(
        `Error with status code ${error.response.status} at URL: ${targetUrl}`,
      );
      res
        .status(error.response.status)
        .send(`Error: ${error.response.statusText}`);
    } else if (error.request) {
      console.error("No response received for the request:", error.message);
      res.status(500).send("Error: No response received from target.");
    } else {
      console.error("Error in request setup:", error.message);
      res.status(500).send("Error: Unable to process the request.");
    }
  }
}

// Enhanced logging for Jina API requests
app.get("/jina/*", async (req, res) => {
  const targetPath = req.url.replace("/jina/", "");
  const targetUrl = `https://r.jina.ai/${targetPath}`;

  console.log("\n\n=== Processing /jina Endpoint Request ===");
  console.log("Original URL:", req.originalUrl);
  console.log("Target Jina URL:", targetUrl);
  console.log("Request headers:", JSON.stringify(req.headers, null, 2));

  try {
    // Fetch markdown content from Jina API
    console.log("Sending request to Jina API...");
    const response = await axios.get(targetUrl, {
      headers: {
        Accept: "text/markdown, text/html",
        "User-Agent": "Custom Proxy",
      },
      maxRedirects: 10, // Handle redirects for Jina API requests as well
    });

    console.log("Received response from Jina API");
    console.log("Status code:", response.status);
    console.log("Response headers:", JSON.stringify(response.headers, null, 2));
    console.log(
      "Response data (first 500 characters):",
      response.data.slice(0, 500),
    );

    // Convert markdown to HTML and send the response
    const htmlDocument = createHtmlDocument(response.data);
    res.setHeader("Content-Type", "text/html").send(htmlDocument);
    console.log("Successfully processed and sent Jina API response as HTML");
  } catch (error) {
    console.error("Error processing Jina API request:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error(
        "Response headers:",
        JSON.stringify(error.response.headers, null, 2),
      );
      console.error(
        "Response data (first 500 characters):",
        error.response.data.slice(0, 500),
      );
    }
    res.status(500).send(`Error fetching content: ${error.message}`);
  }

  console.log("=== Completed /jina Endpoint Request ===\n");
});

// General API proxy endpoint
app.get("/api/*", async (req, res) => {
  console.log("\n\n=== Incoming Request at /api Endpoint ===");
  console.log("Original URL:", req.originalUrl);

  // Clean and validate the target URL
  let targetUrl = req.url.replace("/api/", "");

  // Remove `https://` if present to avoid Vercel’s HTTPS enforcement issues
  if (/^https:\/\//i.test(targetUrl)) {
    targetUrl = targetUrl.replace(/^https:\/\//, "");
  }
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "http://" + targetUrl;
  }

  console.log("Final Target URL (with protocol):", targetUrl);

  // Handle the proxy request with redirect support
  await handleProxyRequest(targetUrl, req, res);
  console.log("=== Request Completed ===\n");
});

// Start the server
app.listen(port, () => {
  console.log(`Running proxy server on port ${port}`);
});
