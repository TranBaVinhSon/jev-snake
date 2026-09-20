// Vercel's edge runtime takes the same (Request) => Response shape as the
// Cloudflare worker, so both deploy targets run the one relay in worker/index.js.
import { relayJev } from "../worker/index.js";

export const config = { runtime: "edge" };

export default relayJev;
