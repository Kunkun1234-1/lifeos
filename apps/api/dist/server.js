import {
  env
} from "./chunk-TTYSRA5W.js";

// src/server.ts
var { buildApp } = await import("./app-7YLTIDQE.js");
var app = await buildApp();
try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
//# sourceMappingURL=server.js.map