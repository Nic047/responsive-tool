import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: "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",
});

const response = await octokit.request(
  "GET /repos/{owner}/{repo}/contents/{path}",
  {
    owner: "Nic047",
    repo: "responsive-tool",
    path: "app/layout.tsx",
    headers: {
      accept: "application/vnd.github.raw",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  }
);

console.log(`The status of the response is: ${response.status}`);
console.log(`The request URL was: ${response.url}`);
console.log(`The response body is:`, response.data);

// import { Octokit } from "octokit";

// const octokit = new Octokit({
//   auth: "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",
// });

// await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
//   owner: "Nic047",
//   repo: "responsive-tool",
//   path: "app/page.tsx",
//   sha: "9007252c56852fbbdfe53e803bbdb45645efafa2",
//   message: "my commit message",
//   committer: {
//     name: "Yo vaddah",
//     email: "vaddah@me.com",
//   },
//   content: "bXkgbmV3IGZpbGUgY29udGVudHM=",
//   headers: {
//     "X-GitHub-Api-Version": "2022-11-28",
//   },
// });
