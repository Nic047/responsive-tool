import { Octokit } from "octokit";
// import { type } from "os";

async function fetchContent(owner, repo, path) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner: owner,
      repo: repo,
      path: path,
      headers: {
        accept: "application/vnd.github.raw",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (response.data.type === "file") {
    return response.data.content;
  }

  if (response.data.type === "dir") {
    return fetchContent("Nic047", "responsive-tool", response.data.path);
  }
  console.log(`The status of the response is: ${response.status}`);
  console.log(`The request URL was: ${response.url}`);
  console.log(`The response body is:`, response.data);

  return fetchContent("Nic047", "responsive-tool", "");
}

fetchContent("Nic047", "responsive-tool", "");
