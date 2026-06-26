import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  listSupportMessages,
  sendSupportMessage,
  type SupportMessage,
} from "@/services/orderSupportChatService";

type Props = {
  orderId: string;
  customerPhone?: string;
  senderRole: "customer" | "staff";
  title: string;
  placeholder: string;
};

export default function OrderSupportChat({
  orderId,
  customerPhone,
  senderRole,
  title,
  placeholder,
}: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const rows = await listSupportMessages(orderId);
    setMessages(rows);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`support:${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_support_messages" },
        () => void refresh(),
      )
      .subscribe();
    const poll = window.setInterval(() => void refresh(), 8000);
    return () => {
      void supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendSupportMessage({
        orderId,
        senderRole,
        body,
        customerPhone,
      });
      setText("");
      await refresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/40">
        <p className="text-sm font-bold">{title}</p>
      </div>
      <div className="max-h-52 overflow-y-auto px-3 py-3 space-y-2 bg-background">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{placeholder}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_role === senderRole;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {m.body}
                  <p className={`text-[9px] mt-1 opacity-70 ${mine ? "" : ""}`}>
                    {new Date(m.created_at).toLocaleTimeString("pt-PT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-border">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva a sua mensagem…"
          className="h-10"
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
        />
        <Button type="button" size="icon" className="h-10 w-10 shrink-0" disabled={sending} onClick={() => void send()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
