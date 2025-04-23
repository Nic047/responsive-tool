"use client";

import type React from "react";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Dynamically import the ProjectContainer component with no SSR
// This is necessary because WebContainer uses browser APIs
const ProjectContainer = dynamic(
  () => import("@/components/ProjectContainer"),
  {
    ssr: false,
  }
);

export default function Home() {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [projectStarted, setProjectStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!owner || !repo) {
      setError("Please enter both owner and repository.");
      setIsLoading(false);
      return;
    }

    // Basic validation for owner and repo (can be improved)
    if (owner.includes("/") || repo.includes("/")) {
      setError("Owner and repository names should not contain '/'.");
      setIsLoading(false);
      return;
    }

    // Simulate API call or processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setProjectStarted(true);
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-primary">
          GitHub Project IDE
        </h1>

        {!projectStarted ? (
          <div className="bg-card shadow-lg rounded-lg p-8 max-w-md mx-auto border border-border">
            <h2 className="text-2xl font-semibold mb-6 text-card-foreground">
              Open a GitHub Repository
            </h2>
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="owner">Owner</Label>
                <Input
                  type="text"
                  id="owner"
                  placeholder="e.g., facebook"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="repo">Repository</Label>
                <Input
                  type="text"
                  id="repo"
                  placeholder="e.g., react"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full font-medium"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? "Loading..." : "Open Repository"}
              </Button>

              <p className="text-xs text-muted-foreground mt-4">
                Note: This will open a web-based IDE with your repository files.
                Make sure you have a valid GitHub token configured.
              </p>
            </form>
          </div>
        ) : (
          <div className="bg-card shadow-lg rounded-lg overflow-hidden border border-border">
            <ProjectContainer owner={owner} repo={repo} />

            <div className="p-4 bg-muted border-t">
              <Button
                variant="outline"
                onClick={() => setProjectStarted(false)}
                className="hover:bg-background"
              >
                Close and Start a New Project
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
