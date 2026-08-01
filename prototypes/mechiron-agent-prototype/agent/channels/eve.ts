import { eveChannel } from "eve/channels/eve";
import { localDev, none, placeholderAuth, vercelOidc } from "eve/channels/auth";

// PROTOTYPE — anonymous access on preview only.
//
// On a preview deployment every other entry in the walk declines (no bearer
// token from a browser, non-loopback host, and placeholderAuth() only throws on
// production), so browser requests got a 401 before any model work ran. This
// opens the walk everywhere except production.
//
// Safe here, and only here: the agent's data is the in-memory fake DB in
// agent/lib/fake-db.ts, and the branch URL sits behind Vercel Deployment
// Protection. Turning that protection off, or pointing the tools at real
// Supabase data, invalidates both halves of that — swap in an AuthFn that
// verifies the Supabase session before either happens.
const previewOnlyOpen = () =>
  process.env.VERCEL_ENV === "production" ? () => null : none();

export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    previewOnlyOpen(),
    // Still the production tripwire: this prototype cannot ship open.
    placeholderAuth(),
  ],
});
