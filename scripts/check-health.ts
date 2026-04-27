const port = process.env.HEALTH_PORT ?? "8080";
const url = `http://127.0.0.1:${port}/health`;

const response = await fetch(url);
if (!response.ok) {
  throw new Error(`Health check failed: ${response.status}`);
}
console.log(await response.text());
