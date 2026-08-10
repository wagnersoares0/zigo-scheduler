import { createServer } from "vite";

const server = await createServer({
  root: process.cwd(),
  logLevel: "error",
  server: { host: "127.0.0.1", port: 0 },
});

await server.listen();
console.log(`READY ${server.resolvedUrls.local[0]}`);

process.on("SIGTERM", async () => {
  await server.close();
  process.exit(0);
});
