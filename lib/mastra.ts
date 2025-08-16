import { MastraClient } from "@mastra/client-js";

export const mastra = new MastraClient({
  // Required
  baseUrl: "http://localhost:4111",
 
  // Optional configurations for development
  retries: 3, // Number of retry attempts
  backoffMs: 300, // Initial retry backoff time
  maxBackoffMs: 5000, // Maximum retry backoff time
  headers: {
    // Custom headers for development
    "X-Development": "true",
  },
});

