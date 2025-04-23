"use client";

import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./ui/resizable";
import { Loader2 } from "lucide-react";

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
  const [previewActive, setPreviewActive] = useState(false);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
    console.log(message);
  };

  const convertToWebContainerFiles = () => {
    // Create a minimal Next.js project
    return {
      "package.json": {
        file: {
          contents: JSON.stringify(
            {
              name: "webcontainer-preview",
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
      },
      "next.config.js": {
        file: {
          contents: `module.exports = { reactStrictMode: true }`,
        },
      },
      pages: {
        directory: {
          "index.js": {
            file: {
              contents: `
export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Repository Preview
      </h1>
      <p>Your repository is running in WebContainer</p>
    </div>
  )
}`,
            },
          },
        },
      },
    };
  };

  const startDevServer = async (instance: WebContainer) => {
    try {
      addLog("Installing dependencies...");
      const installProcess = await instance.spawn("npm", ["install"]);

      installProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            addLog(`[npm] ${chunk}`);
          },
        })
      );

      const installExitCode = await installProcess.exit;

      if (installExitCode !== 0) {
        throw new Error(`Installation failed`);
      }

      addLog("Starting development server...");
      const devProcess = await instance.spawn("npm", ["run", "dev"]);

      devProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            addLog(`[server] ${chunk}`);
          },
        })
      );

      instance.on("server-ready", (port, url) => {
        addLog(`Server is ready!`);
        setPreviewUrl(url);
        setPreviewActive(true);

        const iframeEl =
          document.querySelector<HTMLIFrameElement>("#preview-iframe");
        if (iframeEl) {
          iframeEl.src = url;
        }
      });
    } catch (error) {
      setError(error.message);
    }
  };

  const handlePreview = async () => {
    setIsLoading(true);
    setError(null);
    setLogs([]);
    setPreviewUrl(null);
    setPreviewActive(false);

    try {
      addLog("Starting WebContainer...");
      const instance = await WebContainer.boot();

      const webContainerFiles = convertToWebContainerFiles();
      await instance.mount(webContainerFiles);

      setWebcontainerInstance(instance);
      await startDevServer(instance);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card shadow">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live Preview</h2>
          <Button
            onClick={handlePreview}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <span>Start Preview</span>
            )}
          </Button>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-50 text-red-500 text-sm rounded border border-red-200">
            {error}
          </div>
        )}
      </div>

      <ResizablePanelGroup direction="horizontal" className="h-[70vh]">
        <ResizablePanel defaultSize={25} minSize={15}>
          <div className="h-full overflow-auto p-3 text-xs bg-muted/50">
            <h3 className="font-medium text-sm mb-2">Console Output</h3>
            <div className="bg-black text-white p-2 rounded h-[calc(100%-2rem)] overflow-auto">
              {logs.length === 0 ? (
                <div className="text-gray-400 italic">
                  Click "Start Preview" to begin
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{logs.join("\n")}</pre>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={75}>
          <div className="h-full w-full bg-white">
            {previewActive ? (
              <iframe
                id="preview-iframe"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted/10">
                <div className="text-center max-w-md p-6">
                  <h3 className="text-lg font-medium mb-2">
                    Repository Preview
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Start Preview" to launch a live preview of your
                    repository in an isolated environment.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
