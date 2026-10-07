import { auth } from "@/auth";
import { NextResponse } from "next/server";
import legacyArtUrls from "../public/art-packs/legacy-urls.json";

const LEGACY_ART_URLS: Record<string, string> = legacyArtUrls;

export function isLegacyArtPath(path: string) {
  return Object.prototype.hasOwnProperty.call(LEGACY_ART_URLS, path);
}

/**
 * Auth gate. Protects everything except:
 *   - /login                — sign-in page
 *   - /api/auth/*           — Auth.js routes
 *   - OAuth discovery, registration, and token endpoints
 *   - /_next/*              — Next.js assets
 *   - /favicon.ico, /art-packs/*, legacy art paths, /uploads/*, /gacha/audio/* — static
 */
export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isPublic =
    path === "/login" ||
    path.startsWith("/api/auth") ||
    path === "/.well-known/oauth-authorization-server" ||
    path === "/oauth/register" ||
    path === "/oauth/token" ||
    path.startsWith("/_next") ||
    path.startsWith("/art-packs") ||
    isLegacyArtPath(path) ||
    path.startsWith("/gacha/audio") ||
    path.startsWith("/uploads") ||
    path === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    // API requests get 401 JSON. Page requests get redirected to /login.
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", `${path}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

// Skip middleware on truly static paths to keep the rendering pipeline fast.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
