import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Loader2, ImagePlus, Mic, MicOff, Copy, Trash2, Maximize2, Minimize2, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUsageSnapshotForPrompt, getUsageSnapshot } from "@/lib/usageTelemetry";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Msg = { role: "user" | "assistant"; content: string | ContentPart[] };

const SUGGESTIONS = [
  "Liste meus restaurantes e domínios",
  "Lista todos os restaurantes activos",
  "Muda o plano do Kebab Turco para Premium",
  "Quantos pedidos foram feitos hoje na plataforma?",
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ACTIVE_CONV_KEY = "wgm.assistant.activeConv";

// Web Speech API types (browser-only)
type SpeechRecognitionLike = any;

function getRecognition(): SpeechRecognitionLike | null {
  const w: any = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "pt-BR";
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

function extractText(content: Msg["content"]): string {
  if (typeof content === "string") return content;
  return content.filter((p): p is { type: "text"; text: string } => p.type === "text").map((p) => p.text).join(" ");
}

function extractImages(content: Msg["content"]): string[] {
  if (typeof content === "string") return [];
  return content.filter((p): p is { type: "image_url"; image_url: { url: string } } => p.type === "image_url").map((p) => p.image_url.url);
}

async function copyText(text: string) {
  if (!text.trim()) return;
  await navigator.clipboard.writeText(text);
  toast.success("Resposta copiada");
}

export default function AdminAssistant() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_CONV_KEY); } catch { return null; }
  });
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognitionLike>(null);

  // Restaura mensagens da conversa ativa ao montar / ao abrir
  useEffect(() => {
    if (!conversationId || messages.length > 0) return;
    (async () => {
      const { data } = await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data && data.length > 0) {
        setMessages(data.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
      }
    })();
  }, [conversationId, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Escuta pedidos externos (ex.: botão "Perguntar ao Assistente" da auditoria)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string; autoSend?: boolean }>).detail;
      const text = (detail?.text ?? "").trim();
      if (!text) return;
      setOpen(true);
      if (detail?.autoSend === false) {
        setInput(text);
      } else {
        // Pequeno delay para garantir que o chat está montado
        setTimeout(() => { void send(text); }, 50);
      }
    };
    window.addEventListener("assistant:ask", handler as EventListener);
    return () => window.removeEventListener("assistant:ask", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setPendingImages([]);
    setInput("");
    try { localStorage.removeItem(ACTIVE_CONV_KEY); } catch {}
    toast.success("Conversa nova iniciada");
  };

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
    try { localStorage.setItem(ACTIVE_CONV_KEY, data.id); } catch {}
    return data.id;
  };

  const persistMessage = async (convId: string, role: "user" | "assistant", content: string) => {
    if (!convId || !content) return;
    await supabase.from("ai_messages").insert({ conversation_id: convId, role, content });
    await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      setPendingImages((p) => [...p, dataUrl]);
    }
  };

  const toggleRecord = () => {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) {
      toast.error("Seu navegador não suporta ditado por voz. Use Chrome ou Safari.");
      return;
    }
    let finalText = "";
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    recRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const send = async (text: string, imagesOverride?: string[]) => {
    const images = imagesOverride ?? pendingImages;
    if ((!text.trim() && images.length === 0) || loading) return;

    const userContent: Msg["content"] =
      images.length === 0
        ? text
        : [
            ...(text.trim() ? [{ type: "text" as const, text }] : [{ type: "text" as const, text: "(imagem)" }]),
            ...images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
          ];

    const next: Msg[] = [...messages, { role: "user", content: userContent }];
    setMessages(next);
    setInput("");
    setPendingImages([]);
    setLoading(true);

    const summary = text || `[${images.length} imagem(ns) enviada(s)]`;
    const convId = await ensureConversation(summary);
    if (convId) await persistMessage(convId, "user", summary);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");

      // Injecta snapshot de telemetria local como contexto adicional do utilizador
      const usageMsg: Msg = {
        role: "user",
        content: `[Contexto automático — não responder directamente]\nRota actual: ${window.location.pathname}\n${getUsageSnapshotForPrompt()}`,
      };
      const payloadMessages = [usageMsg, ...next];

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || "Erro no assistente");
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
      toast.error(e.message || "Erro");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-50 group right-4 sm:right-6"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
          aria-label="Abrir assistente"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-elevated text-primary-foreground active:scale-95 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </button>
      )}

      {open && (
        <div
          className={
            expanded
              ? "fixed z-50 inset-2 sm:inset-6 rounded-2xl bg-card border shadow-elevated flex flex-col overflow-hidden"
              : "fixed z-50 right-4 left-4 sm:left-auto sm:right-6 sm:w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100dvh-2rem)] rounded-2xl bg-card border shadow-elevated flex flex-col overflow-hidden"
          }
          style={expanded ? undefined : { bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <header className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight truncate">Assistente Admin Master</p>
                <p className="text-[11px] opacity-80 leading-tight">Edita e configura o sistema por você</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (messages.length === 0 || confirm("Iniciar uma conversa nova? A atual fica salva no histórico.")) startNewConversation();
              }}
              className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center shrink-0"
              aria-label="Nova conversa"
              title="Nova conversa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={() => setOpen(true) /* minimiza apenas */} className="hidden" />
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center shrink-0"
              aria-label={expanded ? "Reduzir" : "Expandir"}
              title={expanded ? "Reduzir o chat" : "Expandir o chat para tela cheia"}
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center shrink-0" aria-label="Minimizar" title="Minimizar (a conversa fica salva)">
              <X className="w-4 h-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-muted/20">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="bg-card border rounded-2xl p-3 text-sm text-muted-foreground">
                  Sou seu co-piloto. Posso **executar mudanças** no sistema: cores do totem, métodos de pagamento, idiomas, banners, planos. Pode mandar **imagem** (anexa pelo clipe) ou **falar** (toca no microfone). Se for algo de código ou layout, gero um pedido pronto pra você colar no Lovable.
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

            {messages.map((m, i) => {
              const text = extractText(m.content);
              const imgs = extractImages(m.content);
              return (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`group relative max-w-[92%] min-w-0 rounded-2xl px-3 py-2 text-sm space-y-2 overflow-hidden select-text [overflow-wrap:anywhere] ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border rounded-bl-sm"
                    }`}
                  >
                    {m.role === "assistant" && text.trim() && (
                      <button
                        type="button"
                        onClick={() => void copyText(text)}
                        className="absolute right-1.5 top-1.5 z-10 w-7 h-7 rounded-full bg-background/90 border text-muted-foreground opacity-70 hover:opacity-100 focus:opacity-100 flex items-center justify-center transition-opacity"
                        aria-label="Copiar resposta"
                        title="Copiar resposta"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {imgs.length > 0 && (
                      <div className="grid grid-cols-2 gap-1">
                        {imgs.map((url, k) => (
                          <img key={k} src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none pr-6 break-words [overflow-wrap:anywhere] prose-p:my-1 prose-p:break-words prose-ol:my-1 prose-ul:my-1 prose-li:break-words prose-strong:text-foreground prose-headings:text-foreground prose-headings:font-bold prose-headings:text-sm prose-pre:max-w-full prose-pre:overflow-x-hidden prose-pre:whitespace-pre-wrap prose-pre:break-words prose-code:whitespace-pre-wrap prose-code:break-words prose-code:[overflow-wrap:anywhere]">
                        <ReactMarkdown>{text || "…"}</ReactMarkdown>
                      </div>
                    ) : (
                      text && <p className="break-words [overflow-wrap:anywhere]">{text}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-card border rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {pendingImages.length > 0 && (
            <div className="px-3 py-2 border-t bg-muted/30 flex gap-2 overflow-x-auto">
              {pendingImages.map((url, i) => (
                <div key={i} className="relative shrink-0">
                  <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border" />
                  <button
                    onClick={() => setPendingImages((p) => p.filter((_, k) => k !== i))}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border flex items-center justify-center"
                    aria-label="Remover"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t bg-card flex items-center gap-2"
          >
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickImage} />
            <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} disabled={loading} aria-label="Anexar imagem">
              <ImagePlus className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={recording ? "default" : "ghost"}
              onClick={toggleRecord}
              disabled={loading}
              aria-label={recording ? "Parar gravação" : "Falar"}
              className={recording ? "animate-pulse" : ""}
            >
              {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? "Ouvindo…" : "Peça qualquer coisa…"}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || (!input.trim() && pendingImages.length === 0)}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
