import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

const isDev = process.env.NODE_ENV !== "production";
const hasGoogle =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams;
  const from =
    sp.from && sp.from.startsWith("/") && !sp.from.startsWith("//")
      ? sp.from
      : "/";
  const session = await auth();
  if (session?.user) redirect(from);

  return (
    <div className="relative z-10 grid min-h-[100dvh] place-items-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-sm border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="text-[var(--gold-deep)]">
            <CompassStar size={56} />
          </div>
          <div className="font-display text-2xl font-bold tracking-[0.08em] text-[var(--fg-strong)]">
            Game Life
          </div>
        </div>

        <p className="text-center text-sm text-[var(--fg-muted)]">
          登录后开始你的人生进度。所有数据按账号隔离。
        </p>

        <div className="space-y-3">
          {hasGoogle && (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: from });
              }}
            >
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-sm border border-[var(--border-strong)] bg-white px-4 py-2.5 font-display text-sm font-medium text-[#1a2230] shadow-sm transition hover:border-[var(--gold)] hover:bg-[var(--gold-tint)]"
              >
                <GoogleMark size={18} />
                Sign in with Google
              </button>
            </form>
          )}

          {isDev && (
            <form
              action={async () => {
                "use server";
                await signIn("dev", { redirectTo: from });
              }}
            >
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-[var(--border-strong)] bg-[var(--bg-page)] px-4 py-2.5 font-display text-xs text-[var(--fg-muted)] hover:border-[var(--gold)] hover:text-[var(--gold-deep)]"
              >
                <span>Dev login (skips OAuth)</span>
              </button>
            </form>
          )}

          {!hasGoogle && !isDev && (
            <p className="text-center text-xs text-[var(--danger)]">
              No auth provider configured. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CompassStar({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <path
        d="M24 3 L26.5 21.5 L45 24 L26.5 26.5 L24 45 L21.5 26.5 L3 24 L21.5 21.5 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <circle cx="24" cy="24" r="2.2" fill="currentColor" />
    </svg>
  );
}

function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
