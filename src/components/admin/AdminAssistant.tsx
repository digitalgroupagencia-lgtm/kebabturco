import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Liste meus restaurantes e domínios",
  "Muda a cor da barra superior do Kebab Turco pra #8B1A1A",
  "Desativa o Apple Pay do Kebab Turco",
  "Ativa só español e english no totem do Kebab Turco",
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;


export default function AdminAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const ensureConversation = async (firstUserMsg: string): Promise<string | null> => {
    if (conversationId) return conversationId;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return null;
    const title = firstUserMsg.slice(0, 60) + (firstUserMsg.length > 60 ? "…" : "");
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: uid, title })
      .select("id")
      .single();
    if (error || !data) return null;
    setConversationId(data.id);
    return data.id;
  };

  const persistMessage = async (convId: string, role: "user" | "assistant", content: string) => {
    if (!convId || !content) return;
    await supabase.from("ai_messages").insert({ conversation_id: convId, role, content });
    await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    const convId = await ensureConversation(text);
    if (convId) await persistMessage(convId, "user", text);

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || "Error en el asistente");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buf = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {}
        }
      }

      if (convId && acc) await persistMessage(convId, "assistant", acc);
    } catch (e: any) {
      toast.error(e.message || "Error");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button — respeita safe-area do iOS */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-50 group right-4 sm:right-6"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)",
          }}
          aria-label="Abrir asistente"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-elevated text-primary-foreground active:scale-95 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed z-50 right-4 left-4 sm:left-auto sm:right-6 sm:w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100dvh-2rem)] rounded-2xl bg-card border shadow-elevated flex flex-col overflow-hidden"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
          }}
        >
          <header className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight truncate">Asistente EL REY</p>
                <p className="text-[11px] opacity-80 leading-tight">Especialista en tu sistema</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center shrink-0">
              <X className="w-4 h-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="bg-card border rounded-2xl p-3 text-sm text-muted-foreground">
                  Soy tu guía experto. Pregúntame cómo configurar la impresora, los pagos, los banners, los colores o cualquier función del sistema.
                </div>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl bg-card border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ol:my-1 prose-ul:my-1 prose-strong:text-foreground prose-headings:text-foreground prose-headings:font-bold prose-headings:text-sm">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-card border rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t bg-card flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta cualquier cosa…"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}