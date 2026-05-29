import { FormEvent, useState } from "react";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  clearAuthToken,
  fetchMe,
  login,
  register,
  type User,
} from "../../lib/api";

type AuthMode = "login" | "register";

interface AuthPanelProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: (user: User) => void;
  onLogout: () => void;
}

export function AuthPanel({
  user,
  open,
  onOpenChange,
  onAuthenticated,
  onLogout,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = () => {
    clearAuthToken();
    onLogout();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      const me = await fetchMe();
      onAuthenticated(me);
      onOpenChange(false);
      setPassword("");
    } catch (e: any) {
      setError(e.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    const initials = user.email.slice(0, 2).toUpperCase();
    return (
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-[11px] text-ink-subtle">Signed in</div>
          <div className="max-w-[180px] truncate text-xs font-medium text-ink-soft">
            {user.email}
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[11px] font-semibold tracking-wide text-paper-elevated">
          {initials}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-paper px-2.5 text-xs font-medium text-ink-soft transition hover:border-hairline-strong hover:text-ink"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-white transition hover:bg-accent-hover"
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign in
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-hairline bg-paper-elevated sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-medium text-ink">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </DialogTitle>
            <DialogDescription className="text-sm text-ink-muted">
              Save valuations and revisit watchlist stocks across sessions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-1 rounded-md border border-hairline bg-paper p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                mode === "login"
                  ? "bg-paper-elevated text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                mode === "register"
                  ? "bg-paper-elevated text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle"
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-10 w-full rounded-md border border-hairline bg-paper px-3 text-sm text-ink outline-none transition focus:border-hairline-strong focus:ring-2 focus:ring-accent/15"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="block text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="h-10 w-full rounded-md border border-hairline bg-paper px-3 text-sm text-ink outline-none transition focus:border-hairline-strong focus:ring-2 focus:ring-accent/15"
              />
            </div>

            {error && (
              <p className="rounded-md border border-bear/30 bg-bear-soft px-3 py-2 text-xs text-bear-ink">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-paper-elevated transition hover:bg-accent-hover disabled:opacity-60"
            >
              {mode === "login" ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isSubmitting
                ? "Working…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
