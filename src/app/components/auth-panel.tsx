import { FormEvent, useState } from "react";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <div className="text-xs text-gray-500">Signed in as</div>
          <div className="text-sm font-medium text-gray-900">{user.email}</div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => onOpenChange(true)}
        className="bg-emerald-600 text-white hover:bg-emerald-700"
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{mode === "login" ? "Sign in" : "Create account"}</DialogTitle>
            <DialogDescription>
              Save stocks to your account for quick access later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
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
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === "register"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-11 border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="h-11 border-gray-200"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {isSubmitting
                ? "Working..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
