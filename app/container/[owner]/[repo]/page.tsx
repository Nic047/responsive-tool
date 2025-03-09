"use client";

import { useParams } from "next/navigation";
import ProjectContainer from "@/components/ProjectContainer";

export default function ContainerPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">WebContainer Project Preview</h1>
      <ProjectContainer owner={owner} repo={repo} />
    </div>
  );
}
