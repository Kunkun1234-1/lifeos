import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Auth gate. Protects everything except:
 *   - /login                — sign-in page
 *   - /api/auth/*           — Auth.js routes
 *   - OAuth discovery, registration, and token endpoints
 *   - /_next/*              — Next.js assets
 *   - /favicon.ico, /lifeos/*, /uploads/*, /gacha/items/*, /gacha/videos/*, /gacha/audio/* — static
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
    path.startsWith("/lifeos") ||
    path.startsWith("/gacha/audio") ||
    path.startsWith("/gacha/backgrounds") ||
    path.startsWith("/gacha/items") ||
    path.startsWith("/gacha/videos") ||
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
