// test-github-token.js
import { Octokit } from "octokit";

async function testToken() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  try {
    const user = await octokit.request("GET /user");
    console.log("Authentication successful!");
    console.log("Logged in as:", user.data.login);

    // Test repo access
    const repo = await octokit.request("GET /repos/{owner}/{repo}", {
      owner: "Nic047",
      repo: "responsive-tool",
    });
    console.log("Repository exists:", repo.data.full_name);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testToken();
