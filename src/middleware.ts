import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkEnabled } from "@/lib/auth/config";
import { isMaintenanceEnabled } from "@/lib/maintenance";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

/** Public marketing pages hidden while HOOKKIT_MAINTENANCE is on. Legal pages stay public. */
const isMaintenanceLanding = createRouteMatcher([
  "/",
  "/docs(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isMaintenanceEnabled() && isMaintenanceLanding(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.rewrite(url);
  }

  if (!isClerkEnabled()) return;
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
