import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Diese funkion gibt den Inhalt einer Datei zurück, wird aber noch nicht abgerufen
async function getFileContent(owner, repo, path) {
  try {
    const fileContent = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
        headers: { accept: "application/vnd.github.raw" },
      }
    );
    console.log("File content:", fileContent.data);
  } catch (error) {
    console.error(`Error fetching file content for ${path}:`, error.message);
  }
}
// Hier haben wir die Content function, gibt die structure des Repos zurück un deren File / Folder namen
async function getContent(owner, repo, path = ".") {
  try {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
        headers: { accept: "application/vnd.github.raw" },
      }
    );
    // Wenn Array (also folder), iteraten wir durch und geben die namen der Folders und files aus
    if (Array.isArray(response.data)) {
      for (const item of response.data) {
        if (item.type === "dir") {
          console.log("Directory:", item.name);
          await getContent(owner, repo, item.path);
        } else if (item.type === "file") {
          console.log("File:", item.name);
          await getFileContent(owner, repo, item.path);
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching content for ${path}:`, error.message);
  }
}

// Start der recursvie function
getContent("Nic047", "responsive-tool");
