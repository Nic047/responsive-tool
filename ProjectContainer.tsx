"use client";

import type React from "react";

import { useEffect, useState, useRef } from "react";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Button } from "@/components/ui/button";
import { Loader, Play, Download, Save } from "lucide-react";
import { FileTree } from "./FileTree";
import "@xterm/xterm/css/xterm.css";

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

export function ProjectContainer({ owner, repo }: ProjectContainerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<RepoItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isInstalling, setIsInstalling] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const webContainerRef = useRef<any>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const shellInputWriter = useRef<WritableStreamDefaultWriter | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

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

  // Function to start the terminal
  const startShell = async () => {
    if (!webContainerRef.current || !terminalInstance.current) return;

    const shellProcess = await webContainerRef.current.spawn("jsh", {
      terminal: {
        cols: terminalInstance.current.cols,
        rows: terminalInstance.current.rows,
      },
    });

    shellProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          if (terminalInstance.current) {
            terminalInstance.current.write(data);
          }
        },
      })
    );

    shellInputWriter.current = shellProcess.input.getWriter();

    // Handle terminal input
    terminalInstance.current.onData((data) => {
      if (shellInputWriter.current) {
        shellInputWriter.current.write(data);
      }
    });

    // Handle terminal resize
    if (fitAddon.current) {
      window.addEventListener("resize", () => {
        fitAddon.current?.fit();
        shellProcess.resize({
          cols: terminalInstance.current?.cols || 80,
          rows: terminalInstance.current?.rows || 24,
        });
      });
    }

    return shellProcess;
  };

  // Function to run a command in the terminal
  const runCommand = async (command: string) => {
    if (!shellInputWriter.current) {
      addLog("Shell not initialized");
      return;
    }

    await shellInputWriter.current.ready;
    await shellInputWriter.current.write(`${command}\n`);
  };

  // Function to save the current file
  const saveFile = async () => {
    if (!webContainerRef.current || !selectedFile || !editorRef.current) return;

    try {
      await webContainerRef.current.fs.writeFile(
        selectedFile,
        editorRef.current.value
      );
      addLog(`File saved: ${selectedFile}`);
    } catch (err) {
      addLog(`Error saving file: ${err}`);
    }
  };

  // Function to install dependencies
  const handleInstall = async () => {
    if (isInstalling) return;

    setIsInstalling(true);
    addLog("Installing dependencies...");
    await runCommand("npm install");
    setIsInstalling(false);
  };

  // Function to start the development server
  const handleStartDev = async () => {
    if (isRunning) return;

    setIsRunning(true);
    addLog("Starting development server...");
    await runCommand("npm run dev");
  };

  // Function to open a file
  const handleFileSelect = async (path: string) => {
    if (!webContainerRef.current) return;

    try {
      const content = await webContainerRef.current.fs.readFile(path, "utf-8");
      setSelectedFile(path);
      setFileContent(content);
    } catch (err) {
      addLog(`Error opening file: ${err}`);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const setupWebContainer = async () => {
      if (!isMounted || !terminalRef.current) return;

      try {
        setLoading(true);
        addLog("Fetching repository data...");

        // Fetch repository data from your API
        const response = await fetch(`/api/github/repo/${owner}/${repo}`);
        if (!response.ok) {
          throw new Error("Failed to fetch repository data");
        }

        const repoData: RepoItem[] = await response.json();
        setFileTree(repoData);
        addLog("Repository data fetched successfully");

        // Initialize terminal
        const terminal = new Terminal({
          convertEol: true,
          cursorBlink: true,
          fontFamily: "monospace",
          fontSize: 14,
        });

        const fitAddonInstance = new FitAddon();
        terminal.loadAddon(fitAddonInstance);
        terminal.open(terminalRef.current);
        fitAddonInstance.fit();

        terminalInstance.current = terminal;
        fitAddon.current = fitAddonInstance;

        // Boot WebContainer
        addLog("Booting WebContainer...");
        const webcontainerInstance = await WebContainer.boot();
        webContainerRef.current = webcontainerInstance;
        addLog("WebContainer booted successfully");

        // Convert repository structure to WebContainer files format
        const files = convertRepoToFiles(repoData);
        addLog("Preparing files for mounting...");

        // Mount files
        addLog("Mounting files...");
        await webcontainerInstance.mount(files);

        // Start shell
        await startShell();
        addLog("Terminal ready");

        // Handle server-ready event
        webcontainerInstance.on("server-ready", (port: number, url: string) => {
          addLog(`Server ready at: ${url}`);
          setServerUrl(url);
          setIsRunning(true);
          setLoading(false);
        });

        setLoading(false);
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

      // Cleanup terminal
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
    };
  }, [owner, repo]);

  // Update content when editing
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFileContent(e.target.value);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-muted p-4 flex justify-between items-center border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-primary">Project:</span> {owner}/{repo}
        </h2>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInstall}
            disabled={isInstalling}
            className="font-medium"
          >
            {isInstalling ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Install Dependencies
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleStartDev}
            disabled={isRunning}
            className="font-medium"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Dev Server
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 m-4 rounded-lg">
          Error: {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <div className="w-64 bg-card overflow-auto border-r">
          <div className="p-3 bg-muted border-b font-medium text-sm flex items-center">
            <span className="text-primary mr-2">Files</span>
          </div>
          <div className="p-2">
            {fileTree.length > 0 ? (
              <FileTree
                items={fileTree}
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            ) : (
              <div className="text-muted-foreground flex items-center justify-center h-20">
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Loading files...
              </div>
            )}
          </div>
        </div>

        {/* Editor and Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {selectedFile ? (
              <div className="h-full flex flex-col">
                <div className="bg-muted p-2 flex justify-between items-center border-b">
                  <span className="font-medium text-sm truncate max-w-[70%]">
                    {selectedFile}
                  </span>
                  <Button
                    size="sm"
                    onClick={saveFile}
                    variant="outline"
                    className="h-8"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Save
                  </Button>
                </div>
                <textarea
                  ref={editorRef}
                  className="flex-1 p-4 font-mono text-sm w-full h-full resize-none outline-none bg-background text-foreground code-editor custom-scrollbar"
                  value={fileContent}
                  onChange={handleEditorChange}
                  spellCheck={false}
                ></textarea>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground bg-card/50">
                Select a file to edit
              </div>
            )}
          </div>

          {/* Terminal */}
          <div className="h-64 border-t">
            <div className="bg-muted p-2 border-b font-medium text-sm flex items-center">
              <span className="text-primary mr-2">Terminal</span>
            </div>
            <div ref={terminalRef} className="h-56 bg-black"></div>
          </div>
        </div>

        {/* Preview and Logs */}
        <div className="w-96 bg-card overflow-hidden flex flex-col border-l">
          {/* Preview */}
          <div className="flex-1 overflow-hidden">
            <div className="bg-muted p-2 border-b font-medium text-sm flex items-center">
              <span className="text-primary mr-2">Preview</span>
            </div>
            {serverUrl ? (
              <iframe
                ref={iframeRef}
                src={serverUrl}
                className="w-full h-full border-none"
                title="App Preview"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground bg-card/50">
                {loading ? (
                  <div className="flex flex-col items-center">
                    <Loader
                      size={24}
                      className="animate-spin mb-2 text-primary"
                    />
                    <span>Loading environment...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Play size={24} className="mb-2 text-muted-foreground" />
                    <span>Server not started</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="h-56 border-t">
            <div className="bg-muted p-2 border-b font-medium text-sm flex items-center">
              <span className="text-primary mr-2">Logs</span>
            </div>
            <div className="h-48 overflow-auto p-2 text-sm custom-scrollbar bg-card/50">
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className="pb-1 mb-1 border-b border-border text-foreground/80 truncate"
                  >
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground flex items-center justify-center h-full">
                  No logs yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
