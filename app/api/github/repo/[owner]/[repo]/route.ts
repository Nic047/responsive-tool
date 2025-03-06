import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";

// Type definitions for our repository items
type RepoItem = {
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string;
  children?: RepoItem[];
};

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const { owner, repo } = params;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Owner and repo parameters are required" },
        { status: 400 }
      );
    }

    // Initialize Octokit with GitHub token
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Start recursive function to get repository structure
    const repoStructure = await getRepoStructure(octokit, owner, repo);

    return NextResponse.json(repoStructure);
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to fetch repository data" },
      { status: 500 }
    );
  }
}

async function getRepoStructure(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = "."
): Promise<RepoItem[]> {
  try {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
      }
    );

    // Process the response data
    if (Array.isArray(response.data)) {
      // It's a directory
      const items: RepoItem[] = [];

      for (const item of response.data) {
        const repoItem: RepoItem = {
          name: item.name,
          path: item.path,
          type: item.type as "file" | "dir",
        };

        if (item.type === "dir") {
          // Recursively get contents of subdirectory
          repoItem.children = await getRepoStructure(
            octokit,
            owner,
            repo,
            item.path
          );
        } else if (item.type === "file") {
          // Get file content
          repoItem.content = await getFileContent(
            octokit,
            owner,
            repo,
            item.path
          );
        }

        items.push(repoItem);
      }

      return items;
    } else {
      // It's a single file (should not happen at the root level, but handling it just in case)
      const item = response.data;
      return [
        {
          name: item.name,
          path: item.path,
          type: "file",
          content: await getFileContent(octokit, owner, repo, item.path),
        },
      ];
    }
  } catch (error) {
    console.error(`Error fetching content for ${path}:`, error);
    return [];
  }
}

async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string | undefined> {
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

    return typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data);
  } catch (error) {
    console.error(`Error fetching file content for ${path}:`, error);
    return undefined;
  }
}
