import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";

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

    // Check if repository exists and is accessible
    await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo,
    });

    // If we reach here, repository exists and is accessible
    return NextResponse.json({ exists: true });
  } catch (error: any) {
    console.error("Error checking repository:", error);

    if (error.status === 404) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    } else if (error.status === 403) {
      return NextResponse.json(
        { error: "Access denied to repository" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to check repository" },
      { status: 500 }
    );
  }
}
