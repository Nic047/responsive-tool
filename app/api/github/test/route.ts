import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Function to fetch file content
async function getFileContent(owner: string, repo: string, path: string) {
  try {
    const fileContent = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
        headers: { accept: "application/vnd.github.raw" },
      }
    );
    console.log("File content:", fileContent.data);
  } catch (error) {
    console.error(`Error fetching file content for ${path}:`, error.message);
  }
}

// Function to recursively fetch repo content (files and directories)
async function getContent(owner: string, repo: string, path = ".") {
  try {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
        headers: { accept: "application/vnd.github.raw" },
      }
    );

    const content = [];

    if (Array.isArray(response.data)) {
      for (const item of response.data) {
        if (item.type === "dir") {
          content.push({ type: "dir", name: item.name });
          await getContent(owner, repo, item.path);
        } else if (item.type === "file") {
          content.push({ type: "file", name: item.name });
          await getFileContent(owner, repo, item.path);
        }
      }
    }

    return content;
  } catch (error) {
    console.error(`Error fetching content for ${path}:`, error.message);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const owner = "Nic047";
    const repo = "responsive-tool";

    const repoContent = await getContent(owner, repo);

    return new Response(JSON.stringify({ content: repoContent }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error in GET route:", error.message);
    return new Response(JSON.stringify({ error: "Failed to fetch content" }), {
      status: 500,
    });
  }
}
