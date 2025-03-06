import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Dein App Secret Key
});

async function getRateLimit() {
  try {
    const rateLimit = await octokit.request("GET /rate_limit");

    console.log("Rate Limit Information:");
    console.log("Remaining:", rateLimit.data.resources.core.remaining);
    console.log("Limit:", rateLimit.data.resources.core.limit);
    console.log(
      "Reset Time (UNIX Timestamp):",
      rateLimit.data.resources.core.reset
    );

    // Weitere Rate Limit-Informationen, z. B. für GraphQL:
    console.log(
      "GraphQL Remaining:",
      rateLimit.data.resources.graphql.remaining
    );
    console.log("GraphQL Limit:", rateLimit.data.resources.graphql.limit);
  } catch (error) {
    console.error("Fehler beim Abrufen des Rate Limits:", error);
  }
}

getRateLimit();
