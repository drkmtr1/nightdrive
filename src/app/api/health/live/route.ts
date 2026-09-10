const health = {
  service: "nightdrive-web",
  stage: "2A",
  status: "ok",
} as const;

export function GET() {
  return Response.json(health, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
