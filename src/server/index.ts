import Fastify from "fastify";
import { registerRoutes } from "./routes";

const app = Fastify({ logger: true });
await registerRoutes(app);

const port = Number(process.env.PORT ?? 4174);
await app.listen({ host: "127.0.0.1", port });
