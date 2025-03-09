"use client";

import { useEffect, useState, useRef } from "react";
import { WebContainer } from "@webcontainer/api";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

interface ProjectContainerProps {
  owner: string;
  repo: string;
}

interface RepoItem {
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string;
  children?: RepoItem[];
}

export default function ProjectContainer({
  owner,
  repo,
}: ProjectContainerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const webContainerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  // Function to convert repo structure to WebContainer files format
  const convertRepoToFiles = (items: RepoItem[], parentPath = "") => {
    const files: any = {};

    for (const item of items) {
      const path = parentPath ? `${parentPath}/${item.name}` : item.name;

      if (item.type === "file") {
        files[path] = {
          file: {
            contents: item.content || "",
          },
        };
      } else if (item.type === "dir") {
        if (item.children && item.children.length > 0) {
          const childFiles = convertRepoToFiles(item.children, path);
          Object.keys(childFiles).forEach((key) => {
            files[key] = childFiles[key];
          });
        } else {
          // Empty directory
          files[path] = {
            directory: {},
          };
        }
      }
    }

    return files;
  };

  useEffect(() => {
    let isMounted = true;

    const setupWebContainer = async () => {
      if (!isMounted) return;

      try {
        setLoading(true);
        addLog("Fetching repository data...");

        // Fetch repository data from your API
        const response = await fetch(`/api/github/repo/${owner}/${repo}`);
        if (!response.ok) {
          throw new Error("Failed to fetch repository data");
        }

        const repoData: RepoItem[] = await response.json();
        addLog("Repository data fetched successfully");

        // Boot WebContainer
        addLog("Booting WebContainer...");
        const webcontainerInstance = await WebContainer.boot();
        webContainerRef.current = webcontainerInstance;
        addLog("WebContainer booted successfully");

        // Convert repository structure to WebContainer files format
        const files = convertRepoToFiles(repoData);
        addLog("Preparing files for mounting...");

        // Add necessary package.json if not present
        if (!files["package.json"]) {
          addLog("Adding default package.json...");
          files["package.json"] = {
            file: {
              contents: JSON.stringify(
                {
                  name: "nextjs-app",
                  version: "0.1.0",
                  private: true,
                  scripts: {
                    dev: "next dev",
                    build: "next build",
                    start: "next start",
                  },
                  dependencies: {
                    next: "13.4.19",
                    react: "18.2.0",
                    "react-dom": "18.2.0",
                  },
                },
                null,
                2
              ),
            },
          };
        }

        // Mount files
        addLog("Mounting files...");
        await webcontainerInstance.mount(files);

        // Verify files were mounted
        addLog("Verifying file mount...");
        const lsProcess = await webcontainerInstance.spawn("ls", ["-la"]);
        lsProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              addLog(`Files in container: ${data}`);
            },
          })
        );
        await lsProcess.exit;

        // Install dependencies
        addLog("Installing dependencies (this may take a few minutes)...");
        const installProcess = await webcontainerInstance.spawn("npm", [
          "install",
        ]);

        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              addLog(`npm install: ${data}`);
            },
          })
        );

        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          throw new Error("Failed to install dependencies");
        }

        addLog("Dependencies installed successfully");

        // Start the development server
        addLog("Starting Next.js development server...");
        const devProcess = await webcontainerInstance.spawn("npx", [
          "next",
          "dev",
          "--hostname",
          "0.0.0.0",
          "--port",
          "3000",
        ]);

        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              addLog(`Next.js server: ${data}`);
            },
          })
        );

        // Handle server-ready event
        webcontainerInstance.on("server-ready", (port, host) => {
          addLog(`Server ready at: ${host}:${port}`);

          // Construct the correct URL
          const cleanHost = host.replace(/^https?:\/\//, "");
          const url = `https://${cleanHost}:${port}`;
          addLog(`App URL: ${url}`);

          setServerUrl(url);
          setLoading(false);
        });
      } catch (err: any) {
        console.error("WebContainer error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    setupWebContainer();

    return () => {
      isMounted = false;
      // Cleanup WebContainer if needed
      if (webContainerRef.current) {
        // Any cleanup needed
      }
    };
  }, [owner, repo]);

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">
          Project: {owner}/{repo}
        </h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4">
          {/* Logs Panel */}
          <div className="w-full md:w-1/3 h-96 overflow-y-auto bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className="pb-1 border-b border-gray-800 mb-1">
                {log}
              </div>
            ))}
          </div>

          {/* Preview Panel */}
          <div className="w-full md:w-2/3 flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center h-96 bg-gray-50 border rounded">
                <div className="flex flex-col items-center">
                  <Loader size={24} className="animate-spin mb-2" />
                  <span>Loading your Next.js project...</span>
                </div>
              </div>
            ) : serverUrl ? (
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center bg-gray-200 px-4 py-2 rounded-t">
                  <span className="font-medium">App Preview</span>
                  <a
                    href={serverUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Open in new tab
                  </a>
                </div>
                <iframe
                  ref={iframeRef}
                  src={serverUrl}
                  className="w-full h-96 border rounded-b"
                  title="Next.js App Preview"
                />
              </div>
            ) : null}

            {!loading && !serverUrl && !error && (
              <div className="flex items-center justify-center h-96 bg-gray-50 border rounded">
                <span>Waiting for server to start...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
