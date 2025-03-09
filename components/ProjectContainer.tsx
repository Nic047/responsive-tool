"use client";

import { useEffect, useState, useRef } from "react";
import { WebContainer } from "@webcontainer/api";
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
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
    // Scroll to bottom of logs
    setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Function to sanitize file paths for WebContainer
  const sanitizePath = (path: string): string => {
    // Remove leading slashes
    let sanitized = path.replace(/^\/+/, "");

    // Replace any problematic characters
    sanitized = sanitized.replace(/[\\:*?"<>|]/g, "_");

    return sanitized;
  };

  // Function to normalize directory structure and handle path issues
  const convertRepoToFiles = (items: RepoItem[]) => {
    const files: any = {};
    const processedPaths = new Set<string>();

    // First, create directories
    const processDirectories = (item: RepoItem, parentPath = "") => {
      if (item.type === "dir") {
        const dirPath = parentPath
          ? `${parentPath}/${sanitizePath(item.name)}`
          : sanitizePath(item.name);

        // Add directory to files object
        files[dirPath] = { directory: {} };
        processedPaths.add(dirPath);

        // Process children recursively
        if (item.children && item.children.length > 0) {
          item.children.forEach((child) => {
            processDirectories(child, dirPath);
          });
        }
      }
    };

    // Create all directories first
    items.forEach((item) => processDirectories(item));

    // Then process files to ensure directories exist
    const processFiles = (item: RepoItem, parentPath = "") => {
      const path = parentPath
        ? `${parentPath}/${sanitizePath(item.name)}`
        : sanitizePath(item.name);

      if (item.type === "file") {
        // Skip problematic files or handle them specially
        if (
          item.path.includes("node_modules") ||
          item.name.startsWith(".") ||
          item.name === "package-lock.json"
        ) {
          return;
        }

        // Add file to files object
        try {
          files[path] = {
            file: {
              contents: item.content || "",
            },
          };
          processedPaths.add(path);
        } catch (err) {
          addLog(`Warning: Could not process file ${path}`);
        }
      } else if (item.type === "dir" && item.children) {
        // Process files in this directory
        item.children.forEach((child) => {
          if (child.type === "file") {
            processFiles(child, path);
          }
        });
      }
    };

    // Process all items
    items.forEach((item) => {
      if (item.type === "file") {
        processFiles(item);
      } else if (item.type === "dir" && item.children) {
        item.children.forEach((child) => {
          if (child.type === "file") {
            processFiles(child, item.name);
          }
        });
      }
    });

    addLog(`Processed ${processedPaths.size} files and directories`);
    return files;
  };

  // Function to create a minimal working Next.js project
  const createMinimalNextProject = () => {
    const files: any = {
      "package.json": {
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
      },
      "next.config.js": {
        file: {
          contents: `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
          `,
        },
      },
      app: { directory: {} },
      "app/page.tsx": {
        file: {
          contents: `
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">
          Welcome to{' '}
          <a className="text-blue-600" href="https://nextjs.org">
            Next.js!
          </a>
        </h1>

        <p className="mt-3 text-2xl">
          This is a minimal Next.js app running in WebContainer
        </p>
      </main>
    </div>
  )
}
          `,
        },
      },
      "app/layout.tsx": {
        file: {
          contents: `
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
          `,
        },
      },
    };

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
        addLog(`Found ${repoData.length} top-level items in the repository`);

        // Boot WebContainer
        addLog("Booting WebContainer...");
        const webcontainerInstance = await WebContainer.boot();
        webContainerRef.current = webcontainerInstance;
        addLog("WebContainer booted successfully");

        let files;
        try {
          // Convert repository structure to WebContainer files format
          addLog("Preparing files for mounting...");
          files = convertRepoToFiles(repoData);
        } catch (err) {
          addLog(
            "Error processing repository files: " + (err as Error).message
          );
          addLog("Falling back to minimal Next.js project...");
          files = createMinimalNextProject();
        }

        // Mount files incrementally to avoid errors
        addLog("Mounting files...");
        try {
          // Create root directories first
          const rootDirs = Object.entries(files).filter(
            ([path, content]) =>
              !path.includes("/") && "directory" in (content as any)
          );

          for (const [path, content] of rootDirs) {
            try {
              await webcontainerInstance.mount({ [path]: content });
              addLog(`Mounted directory: ${path}`);
            } catch (err) {
              addLog(
                `Failed to mount directory ${path}: ${(err as Error).message}`
              );
            }
          }

          // Then create root files
          const rootFiles = Object.entries(files).filter(
            ([path, content]) =>
              !path.includes("/") && "file" in (content as any)
          );

          for (const [path, content] of rootFiles) {
            try {
              await webcontainerInstance.mount({ [path]: content });
              addLog(`Mounted file: ${path}`);
            } catch (err) {
              addLog(`Failed to mount file ${path}: ${(err as Error).message}`);
            }
          }

          // Then handle nested structures
          const remainingItems = Object.entries(files).filter(([path]) =>
            path.includes("/")
          );

          // Group by directory depth to ensure parent directories exist before their children
          const byDepth = remainingItems.sort((a, b) => {
            const depthA = a[0].split("/").length;
            const depthB = b[0].split("/").length;
            return depthA - depthB;
          });

          for (const [path, content] of byDepth) {
            try {
              await webcontainerInstance.mount({ [path]: content });
              // Don't log every file to avoid cluttering the logs
              if ("directory" in (content as any)) {
                addLog(`Mounted directory: ${path}`);
              }
            } catch (err) {
              addLog(`Skipped item ${path}: ${(err as Error).message}`);
            }
          }
        } catch (err) {
          addLog(`Error during file mounting: ${(err as Error).message}`);
          addLog("Will continue with setup anyway...");
        }

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

        // Check if package.json exists
        try {
          await webcontainerInstance.fs.readFile("package.json");
          addLog("package.json found, proceeding with installation");
        } catch (err) {
          addLog("package.json not found, creating minimal package.json");
          const minimalPackageJson = {
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
          };

          await webcontainerInstance.fs.writeFile(
            "package.json",
            JSON.stringify(minimalPackageJson, null, 2)
          );
        }

        // Install dependencies
        addLog("Installing dependencies (this may take a few minutes)...");
        const installProcess = await webcontainerInstance.spawn("npm", [
          "install",
        ]);

        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              // Log npm install output but avoid excessive logging
              if (data.includes("added") || data.includes("error")) {
                addLog(`npm install: ${data}`);
              }
            },
          })
        );

        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          addLog(
            "Warning: npm install had issues, but we'll try to start the server anyway"
          );
        } else {
          addLog("Dependencies installed successfully");
        }

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
            <div ref={logEndRef} />
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
