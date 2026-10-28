import { museOpenApi } from "@/app/_composition/muse-openapi";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";

export const dynamic = "force-dynamic";

/** The connector description (public: it holds no data and no key). */
export const GET = () => Response.json(museOpenApi(PUBLIC_BASE_URL));
