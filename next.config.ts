import type { NextConfig } from "next";
// PROTOTYPE — mounts the throwaway eve agent on this app's origin at
// /eve/v1/*, and boots its dev server alongside `next dev`. Remove together
// with src/components/prototype/ and the `eve` dependency.
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  experimental: {
    // Re-enable the client-side Router Cache for dynamic pages (Next defaulted
    // this to 0 in v15). Caches a visited page's RSC payload for 30s, so
    // flipping back to a recently-viewed page is instant with no server trip.
    // Mutations use revalidatePath(), which invalidates the cached path.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default withEve(nextConfig, {
  eveRoot: "./prototypes/mechiron-agent-prototype",
});
