import { WebContainer } from "@webcontainer/api";

window.addEventListener("load", async () => {
  const runCommand = async (cmd, args) => {
    const process = await webcontainerInstance.spawn(cmd, args);

    process.output.pipeTo(
      new WritableStream({
        write: (chunk) => {
          reportOutput("Process output:" + chunk);
        },
      })
    );

    if (await process.exit) {
      reportOutput("Process exited with code ${process.exit}");
    } else {
      reportOutput("Process is still running");
    }
  };

  const reportOutput = (output) => {
    outputPanel.textContent += "\n" + output;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cmd = command.value.split(" ")[0];
    const args = command.value.split(" ").slice(1);
    await runCommand(cmd, args);
  });
  console.log("Booting started");
  const webcontainerInstance = await WebContainer.boot();
  console.log("Booting complete.");

  // Define your files object here - this should match your Next.js project structure
  const files = {
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
    "package.json": {
      file: {
        contents: `
        {
          "name": "nextjs-app",
          "version": "0.1.0",
          "private": true,
          "scripts": {
            "dev": "next dev",
            "build": "next build",
            "start": "next start",
            "lint": "next lint"
          },
          "dependencies": {
            "next": "13.4.19",
            "react": "18.2.0",
            "react-dom": "18.2.0"
          },
          "devDependencies": {
            "autoprefixer": "10.4.14",
            "postcss": "8.4.27",
            "tailwindcss": "3.3.3"
          }
        }
        `,
      },
    },
    public: {
      directory: {},
    },
    src: {
      directory: {
        app: {
          directory: {
            "page.js": {
              file: {
                contents: `
                export default function Home() {
                  return (
                    <div className="flex flex-col items-center gap-8">
                      <h1 className="text-4xl font-bold text-center">Welcome to My Next.js App</h1>
                      <p className="text-xl text-center max-w-2xl">
                        This is a sample Next.js application using the App Router. Get started by editing this page.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {[1, 2, 3].map((num) => (
                          <div key={num} className="p-6 border rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-2">Feature {num}</h2>
                            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                `,
              },
            },
            "layout.js": {
              file: {
                contents: `
                import './globals.css';

                export const metadata = {
                  title: 'Next.js App',
                  description: 'Created with Next.js App Router',
                };
                
                export default function RootLayout({ children }) {
                  return (
                    <html lang="en">
                      <body className="__className_d65c78">
                        <header className="p-4 bg-blue-500 text-white">
                          <nav className="container mx-auto flex justify-between">
                            <h1 className="text-xl font-bold">My Next.js App</h1>
                            <div className="flex gap-4">
                              <a href="/">Home</a>
                              <a href="/about">About</a>
                              <a href="/blog">Blog</a>
                            </div>
                          </nav>
                        </header>
                        <main className="container mx-auto py-8">
                          {children}
                        </main>
                        <footer className="p-4 bg-gray-200">
                          <div className="container mx-auto text-center">
                            <p>© 2025 My Next.js App. All rights reserved.</p>
                          </div>
                        </footer>
                      </body>
                    </html>
                  );
                }
                `,
              },
            },
            "globals.css": {
              file: {
                contents: `
                @tailwind base;
                @tailwind components;
                @tailwind utilities;
                
                :root {
                  --foreground-rgb: 0, 0, 0;
                  --background-rgb: 255, 255, 255;
                }
                
                body {
                  color: rgb(var(--foreground-rgb));
                  background: rgb(var(--background-rgb));
                }
                `,
              },
            },
            "not-found.js": {
              file: {
                contents: `
                import Link from 'next/link';
                
                export default function NotFound() {
                  return (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                      <h1 className="text-6xl font-bold text-gray-800">404</h1>
                      <h2 className="text-2xl font-semibold mt-4 mb-6">Page Not Found</h2>
                      <p className="mb-8 text-gray-600 max-w-md">
                        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                      </p>
                      <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                        Return to Homepage
                      </Link>
                    </div>
                  );
                }
                `,
              },
            },
          },
        },
      },
    },
    "tsconfig.json": {
      file: {
        contents: `
        {
          "compilerOptions": {
            "lib": ["dom", "dom.iterable", "esnext"],
            "allowJs": true,
            "skipLibCheck": true,
            "strict": true,
            "forceConsistentCasingInFileNames": true,
            "noEmit": true,
            "incremental": true,
            "esModuleInterop": true,
            "module": "esnext",
            "moduleResolution": "node",
            "resolveJsonModule": true,
            "isolatedModules": true,
            "jsx": "preserve",
            "plugins": [
              {
                "name": "next"
              }
            ],
            "paths": {
              "@/*": ["./src/*"]
            }
          },
          "include": ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
          "exclude": ["node_modules"]
        }
        `,
      },
    },
  };

  async function startDevServer() {
    console.log("Writing main.js file...");
    const writeProcess = await webcontainerInstance.fs.writeFile(
      "main.js",
      'console.log("Hello from WebContainers!")'
    );
    await webcontainerInstance.fs.readFile("main.js");

    const catProcess2 = await webcontainerInstance.spawn("cat", ["main.js"]);
    catProcess2.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log("Main.js content:", data);
        },
      })
    );
    await catProcess2.exit;

    console.log("Mounting files...");
    try {
      // Mount files first
      await webcontainerInstance.mount(files);

      // Verify files were mounted properly
      console.log("Verifying file mount...");
      const lsProcess = await webcontainerInstance.spawn("ls", ["-la"]);
      lsProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log("Files in container:", data);
          },
        })
      );
      await lsProcess.exit;

      // Check package.json specifically
      console.log("Checking package.json...");
      const catProcess = await webcontainerInstance.spawn("cat", [
        "package.json",
      ]);
      catProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log("Package.json content:", data);
          },
        })
      );
      await catProcess.exit;

      // Run npm install
      console.log("Running npm install...");
      const installProcess = await webcontainerInstance.spawn("npm", [
        "install",
      ]);
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log("Install output:", data);
          },
        })
      );

      const installExitCode = await installProcess.exit;
      if (installExitCode !== 0) {
        throw new Error("Unable to run npm install");
      }

      // Start the dev server with explicit hostname and port
      console.log("Starting Next.js dev server...");
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
            console.log("Dev server output:", data);
          },
        })
      );
    } catch (error) {
      console.error("Error in startDevServer:", error);
    }
  }

  // Start the server
  startDevServer();

  // In the server-ready event handler, fix how we construct the URL
  webcontainerInstance.on("server-ready", async (port, host) => {
    console.log("Server ready at:", host + ":" + port);

    // Construct the correct URL - remove any protocol from the host if present
    const cleanHost = host.replace(/^https?:\/\//, "");
    const correctUrl = `https://${cleanHost}:${port}`;
    console.log("Corrected URL:", correctUrl);

    // Test if the server is actually serving content
    try {
      console.log("Testing server response...");
      const curlProcess = await webcontainerInstance.spawn("curl", [
        "-v",
        `http://localhost:${port}`,
      ]);
      curlProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log("Server response:", data);
          },
        })
      );
    } catch (error) {
      console.error("Error testing server:", error);
    }

    // Create preview container with both iframe and external link
    const existingPreview = document.getElementById("preview-container");
    if (existingPreview) {
      existingPreview.remove();
    }

    // Create container
    const container = document.createElement("div");
    container.id = "preview-container";
    container.style.marginTop = "20px";
    container.style.border = "1px solid #ccc";
    container.style.borderRadius = "4px";
    container.style.overflow = "hidden";

    // Add header with link
    const header = document.createElement("div");
    header.style.padding = "8px";
    header.style.borderBottom = "1px solid #ccc";
    header.style.backgroundColor = "#f5f5f5";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";

    const title = document.createElement("span");
    title.textContent = "Next.js App Preview";
    title.style.fontWeight = "bold";

    const link = document.createElement("a");
    link.href = correctUrl;
    link.target = "_blank";
    link.textContent = "Open in new tab";

    header.appendChild(title);
    header.appendChild(link);
    container.appendChild(header);

    // Add iframe
    const iframe = document.createElement("iframe");
    iframe.src = correctUrl;
    iframe.style.width = "100%";
    iframe.style.height = "600px";
    iframe.style.border = "none";

    container.appendChild(iframe);

    // Try to find a good place to add the preview
    const targetElement = document.querySelector("main") || document.body;
    targetElement.appendChild(container);

    // Also open in a new tab as fallback
    window.open(correctUrl, "_blank");
  });
});
