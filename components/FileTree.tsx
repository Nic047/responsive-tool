import React, { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";

interface FileTreeProps {
  items: RepoItem[];
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
}

interface RepoItem {
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string;
  children?: RepoItem[];
}

const FileTreeItem: React.FC<{
  item: RepoItem;
  level: number;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
}> = ({ item, level, onFileSelect, selectedFile }) => {
  const [expanded, setExpanded] = useState(level === 0); // Expand first level by default

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleFileSelect = () => {
    if (item.type === "file") {
      onFileSelect(item.path);
    }
  };

  const isSelected = selectedFile === item.path;

  return (
    <div className="my-1">
      <div
        className={`flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded ${
          isSelected ? "bg-blue-100" : ""
        }`}
        onClick={item.type === "dir" ? toggleExpand : handleFileSelect}
        style={{ paddingLeft: `${level * 8}px` }}
      >
        {item.type === "dir" ? (
          <>
            <span className="mr-1">
              {expanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </span>
            <Folder size={16} className="mr-1 text-blue-600" />
            <span className="font-medium">{item.name}</span>
          </>
        ) : (
          <>
            <span className="mr-1 w-4"></span>
            <File size={16} className="mr-1 text-gray-600" />
            <span>{item.name}</span>
          </>
        )}
      </div>

      {expanded && item.type === "dir" && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({
  items,
  onFileSelect,
  selectedFile,
}) => {
  return (
    <div className="file-tree custom-scrollbar">
      {items.map((item) => (
        <FileTreeItem
          key={item.path}
          item={item}
          level={0}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  );
};
