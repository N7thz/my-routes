"use client";

import { createAuthClient } from "better-auth/react";

// No baseURL: the client infers the current origin from window.location,
// so it always hits the same host that served the page (localhost in dev,
// the deployed domain in production). Hardcoding a prod URL here breaks
// local dev with a cross-origin "Failed to fetch".
export const { signIn, signOut } = createAuthClient();
