import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Auth gate. Protects everything except:
 *   - /login                — sign-in page
 *   - /api/auth/*           — Auth.js routes
 *   - /_next/*              — Next.js assets
 *   - /favicon.ico, /lifeos/*, /uploads/* — static
 */
export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isPublic =
    path === "/login" ||
    path.startsWith("/api/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/lifeos") ||
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
    url.searchParams.set("from", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

// Skip middleware on truly static paths to keep the rendering pipeline fast.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
