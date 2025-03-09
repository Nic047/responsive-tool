"use client";

import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./ui/resizable";

interface WebContainerProps {
  files: Record<string, any>; // Your GitHub repo files structure
}

export default function WebContainerPreview({ files }: WebContainerProps) {
  const [webcontainerInstance, setWebcontainerInstance] =
    useState<WebContainer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
    console.log(message);
  };

  const convertToWebContainerFiles = () => {
    const result: Record<string, any> = {};

    // Add package.json
    result["package.json"] = {
      file: {
        contents: JSON.stringify(
          {
            name: "nextjs-preview",
            version: "0.1.0",
            private: true,
            scripts: {
              dev: "next dev -p 4000",
              build: "next build",
              start: "next start -p 4000",
            },
            dependencies: {
              next: "12.3.4",
              react: "17.0.2",
              "react-dom": "17.0.2",
            },
          },
          null,
          2
        ),
      },
    };

    // Add next.config.js
    result["next.config.js"] = {
      file: {
        contents: `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
}
module.exports = nextConfig
        `.trim(),
      },
    };

    // Add pages/index.js
    result["pages"] = {
      directory: {
        "index.js": {
          file: {
            contents: `
// pages/index.js
export default function Home() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Hello from WebContainer</h1>
    </div>
  )
}`.trim(),
          },
        },
      },
    };

    return result;
  };

  const startDevServer = async (instance: WebContainer) => {
    try {
      // Check directory contents
      const lsProcess = await instance.spawn("ls", ["-la"]);
      lsProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            addLog(`[ls] ${chunk}`);
          },
        })
      );
      await lsProcess.exit;

      // Check pages directory
      const lsPagesProcess = await instance.spawn("ls", ["-la", "pages"]);
      lsPagesProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            addLog(`[ls pages] ${chunk}`);
          },
        })
      );
      await lsPagesProcess.exit;

      // Install dependencies
      addLog("Starting npm install...");
      const installProcess = await instance.spawn("npm", ["install"]);
      installProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            addLog(`[npm install] ${chunk}`);
          },
        })
      );
      const installExitCode = await installProcess.exit;

      if (installExitCode !== 0) {
        throw new Error(`npm install failed with exit code ${installExitCode}`);
      }

      // Start dev server
      addLog("Starting dev server...");
      const devProcess = await instance.spawn("npm", ["run", "dev"]);
      devProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            addLog(`[dev server] ${chunk}`);
          },
        })
      );

      // Listen for server-ready event
      instance.on("server-ready", (port, url) => {
        addLog(`Server is ready on: ${url}`);
        setPreviewUrl(url);

        // Add a delay before setting the iframe src
        setTimeout(() => {
          const iframeEl =
            document.querySelector<HTMLIFrameElement>("#preview-iframe");
          if (iframeEl) {
            addLog(`Setting iframe src to: ${url}`);
            iframeEl.src = url;
          }
        }, 2000); // 2 second delay
      });
    } catch (error) {
      console.error("Error in startDevServer:", error);
      setError(error.message);
    }
  };

  const handlePreview = async () => {
    setIsLoading(true);
    setError(null);
    setLogs([]);
    setPreviewUrl(null);

    try {
      addLog("Starting WebContainer boot...");
      const instance = await WebContainer.boot();
      addLog("WebContainer booted successfully");

      const webContainerFiles = convertToWebContainerFiles();
      addLog("Mounting files with structure:");
      addLog(JSON.stringify(webContainerFiles, null, 2));

      await instance.mount(webContainerFiles);
      addLog("Files mounted successfully");

      setWebcontainerInstance(instance);
      await startDevServer(instance);
    } catch (error) {
      console.error("Failed to start preview:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex gap-4 items-center">
          <Button onClick={handlePreview} disabled={isLoading}>
            {isLoading ? "Loading Preview..." : "Live Preview"}
          </Button>
          {previewUrl && (
            <div className="text-sm text-gray-600">
              Preview URL: {previewUrl}
            </div>
          )}
        </div>
        {error && <div className="text-red-500">Error: {error}</div>}
      </div>

      <ResizablePanelGroup direction="horizontal" className="h-[80vh]">
        <ResizablePanel defaultSize={30}>
          <div className="h-full overflow-auto p-4 bg-gray-50 text-sm">
            <h3 className="font-bold mb-2">Logs:</h3>
            <pre className="whitespace-pre-wrap text-xs">{logs.join("\n")}</pre>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={70}>
          <div className="h-full w-full bg-white">
            <iframe
              id="preview-iframe"
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              title="Preview"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
