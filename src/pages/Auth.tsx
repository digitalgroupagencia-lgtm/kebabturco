import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecretInput } from "@/components/ui/secret-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, User, ChefHat, Loader2 } from "lucide-react";
import { APP_NAME } from "@/lib/appMode";
import { resolvePostLoginDestination } from "@/lib/authRedirect";
import { translateAppErrorFromException } from "@/lib/authErrorMessages";
import { signInWithGoogleOAuth } from "@/lib/googleOAuth";
import { nav } from "@/lib/navPaths.ts";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const signupFromUrl = searchParams.get("signup") === "1" || searchParams.get("mode") === "signup";
  const [isLogin, setIsLogin] = useState(!signupFromUrl);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();
  const nextParam = searchParams.get("next");
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    let active = true;
    (async () => {
      if (authLoading) return;
      if (!active) return;
      if (user?.id) {
        const dest = await resolvePostLoginDestination(user.id, nextParam);
        navigate(dest.path, { replace: true });
        return;
      }
      setCheckingSession(false);
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user?.id, navigate, nextParam]);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <p className="text-sm text-muted-foreground">A verificar sessão…</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        const userId = data.user?.id;
        if (userId) {
          const dest = await resolvePostLoginDestination(userId, nextParam);
          navigate(dest.path);
        } else {
          navigate(nav.panel());
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Verifique seu email para confirmar o cadastro!");
      }
    } catch (error: unknown) {
      toast.error(translateAppErrorFromException(error, "pt"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const nextQuery = nextParam ? `?next=${encodeURIComponent(nextParam)}` : "";
      await signInWithGoogleOAuth({
        redirectUri: `${window.location.origin}${nav.auth()}${nextQuery}`,
        lang: "pt",
      });
    } catch (error: unknown) {
      toast.error(translateAppErrorFromException(error, "pt"));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-2">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{isLogin ? "Entrar" : "Criar conta"}</CardTitle>
          <CardDescription>
            {isLogin
              ? `${APP_NAME} · acesse o painel ou administração`
              : "Cadastre-se para começar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <SecretInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={loading || googleLoading}>
              {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          {!isLogin ? null : (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-semibold"
                disabled={loading || googleLoading}
                onClick={() => void handleGoogleLogin()}
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A abrir Google…
                  </>
                ) : (
                  "Entrar com Google"
                )}
              </Button>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? "Cadastre-se" : "Fazer login"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
