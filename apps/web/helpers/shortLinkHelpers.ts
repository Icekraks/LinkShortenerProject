import "server-only";

import { dbPool } from "@/lib/db";
import { RESOLVE_SHORT_LINK_QUERY } from "@/sql/resolveShortLink";

export type ResolveLinkRow = {
  original_url: string;
};

export const getActiveLinkByShortCode = async (shortCode: string) => {
  const result = await dbPool.query<ResolveLinkRow>(RESOLVE_SHORT_LINK_QUERY, [shortCode]);
  return result.rows[0];
};
