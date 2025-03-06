// app/page.tsx
"use client";

import { useEffect, useState } from "react";

// Define types for the data we expect from the API
interface RepoContent {
  name: string;
  path: string;
  type: "file" | "dir";
  url: string;
}

export default function Home() {
  const [repoContent, setRepoContent] = useState<RepoContent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the repository content on page load
  useEffect(() => {
    const fetchRepoContent = async () => {
      try {
        const response = await fetch("/api/github/repo/Nic047/responsive-tool"); // Example: octocat's Hello-World repo
        if (!response.ok) {
          throw new Error("Failed to fetch repository content");
        }
        const data = await response.json();
        setRepoContent(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchRepoContent();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!repoContent) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
      <div className="space-y-4">
        {/* Display the repository content */}
        <ul>
          {repoContent.map((item) => (
            <li key={item.path}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {item.type === "dir" ? "📂" : "📄"} {item.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
