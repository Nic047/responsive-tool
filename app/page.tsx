"use client";

import { Button } from "@/components/ui/button";
import { File, Folder, FolderOpen, RefreshCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { python } from "@codemirror/lang-python";
import { markdown } from "@codemirror/lang-markdown";
import { json } from "@codemirror/lang-json";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

// Define types for the data we expect from the API
interface RepoContent {
  name: string;
  path: string;
  type: "file" | "dir";
  url?: string;
  content?: string; // For file content
  children?: RepoContent[]; // For folder content
}

export default function Home() {
  const [repoContent, setRepoContent] = useState<RepoContent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleFolderClick = (path: string) => {
    setOpenFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const getLanguageExtension = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    // Map file extensions to CodeMirror language extensions
    switch (extension) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return javascript();
      case "html":
        return html();
      case "css":
        return css();
      case "py":
        return python();
      case "md":
        return markdown();
      case "json":
        return json();
      default:
        return javascript(); // Default to JavaScript
    }
  };

  // Fetch the repository content on page load
  useEffect(() => {
    const fetchRepoContent = async () => {
      setLoading(true);

      const cachedData = localStorage.getItem("repoContent");

      if (cachedData) {
        console.log("Loading Repo Data from Cache");
        setRepoContent(JSON.parse(cachedData));
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/github/repo/Nic047/responsive-tool");
        if (!response.ok) {
          throw new Error("Failed to fetch repository content");
        }
        const data = await response.json();
        setRepoContent(data);
        setError(null);
        localStorage.setItem("repoContent", JSON.stringify(data));
        console.log("Data cached in localStorage");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoContent();
  }, []);

  const handleFileClick = (item: RepoContent) => {
    // Check if there are unsaved changes
    if (hasUnsavedChanges && currentFilePath) {
      if (confirm("You have unsaved changes. Do you want to discard them?")) {
        // User confirmed to discard changes
        loadFile(item);
      }
    } else {
      // No unsaved changes, load the file directly
      loadFile(item);
    }
  };

  const loadFile = (item: RepoContent) => {
    setCurrentCode(item.content || "");
    setCurrentFilePath(item.path);
    setCurrentFileName(item.name);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCodeChange = (value: string) => {
    setCurrentCode(value);
    setHasUnsavedChanges(true);
  };

  const handleSaveClick = () => {
    if (currentFilePath) {
      // Update the file content in the repoContent state
      if (repoContent) {
        const updateFileContent = (
          items: RepoContent[],
          path: string,
          content: string
        ): boolean => {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.path === path && item.type === "file") {
              item.content = content;
              return true;
            }
            if (item.children) {
              if (updateFileContent(item.children, path, content)) {
                return true;
              }
            }
          }
          return false;
        };

        const newRepoContent = [...repoContent];
        updateFileContent(newRepoContent, currentFilePath, currentCode);
        setRepoContent(newRepoContent);

        // Update cache
        localStorage.setItem("repoContent", JSON.stringify(newRepoContent));
      }

      setIsEditing(false);
      setHasUnsavedChanges(false);
    }
  };

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!repoContent) {
    return <div>No repository content available.</div>;
  }

  // Recursive function to render files and folders
  const renderItem = (item: RepoContent) => {
    if (item.type === "file") {
      return (
        <li key={item.path} className="flex items-center space-x-2">
          <span className="text-gray-600">
            <File size={16} />
          </span>
          <button
            onClick={() => handleFileClick(item)}
            className={`text-gray-700 hover:underline hover:cursor-pointer ${
              currentFilePath === item.path ? "font-bold text-blue-600" : ""
            }`}
          >
            {item.name}
          </button>
        </li>
      );
    }

    // Folder item
    const isOpen = openFolders.has(item.path);
    return (
      <li key={item.path} className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">
            {isOpen ? <FolderOpen size={16} /> : <Folder size={16} />}
          </span>
          <button
            onClick={() => handleFolderClick(item.path)}
            className="text-black hover:underline font-medium hover:cursor-pointer"
          >
            {item.name}
          </button>
        </div>

        {isOpen && item.children && item.children.length > 0 && (
          <ul className="pl-6 border-l border-gray-200">
            {item.children.map((subItem) => renderItem(subItem))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Repository Code Editor</h1>
          <div className="flex space-x-2">
            {currentFilePath && !isEditing && (
              <Button
                onClick={handleEditClick}
                size="sm"
                className="flex items-center gap-2"
                variant="outline"
              >
                Edit
              </Button>
            )}
            {isEditing && (
              <Button
                onClick={handleSaveClick}
                size="sm"
                className="flex items-center gap-2"
                variant={hasUnsavedChanges ? "default" : "outline"}
              >
                <Save size={16} />
                Save {hasUnsavedChanges && "*"}
              </Button>
            )}
            <Button
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm("You have unsaved changes. Proceed anyway?")) {
                    localStorage.removeItem("repoContent");
                    window.location.reload();
                  }
                } else {
                  localStorage.removeItem("repoContent");
                  window.location.reload();
                }
              }}
              size="sm"
              className="flex items-center gap-2"
              variant="outline"
            >
              <RefreshCcw size={16} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex gap-6 h-[70vh]">
          <div className="w-1/4 overflow-y-auto border rounded-lg p-4 bg-gray-50">
            <ul className="space-y-2">
              {repoContent.map((item) => renderItem(item))}
            </ul>
          </div>

          <div className="w-3/4 overflow-hidden border rounded-lg bg-gray-50 flex flex-col">
            {currentFilePath && (
              <div className="bg-gray-200 px-4 py-2 text-sm font-mono border-b flex justify-between items-center">
                <span>{currentFilePath}</span>
                {hasUnsavedChanges && <span className="text-red-500">*</span>}
              </div>
            )}

            <div className="overflow-y-auto flex-grow">
              {currentFilePath ? (
                <div className="h-full">
                  <CodeMirror
                    value={currentCode}
                    height="100%"
                    theme={vscodeDark}
                    extensions={
                      currentFileName
                        ? [getLanguageExtension(currentFileName)]
                        : []
                    }
                    onChange={handleCodeChange}
                    editable={isEditing}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLine: true,
                      highlightSelectionMatches: true,
                      autocompletion: true,
                      foldGutter: true,
                      indentOnInput: true,
                    }}
                  />
                </div>
              ) : (
                <div className="text-gray-500 flex items-center justify-center h-full">
                  Click on a file to view its content
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
