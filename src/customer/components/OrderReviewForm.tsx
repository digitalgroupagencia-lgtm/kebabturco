import { useEffect, useState } from "react";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { supabase as _sb } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { appToastError, appToastSuccess } from "@/lib/appToast";

const supabase = _sb as unknown as any;

type Props = { orderId: string };

export default function OrderReviewForm({ orderId }: Props) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.rpc("has_order_review", { _order_id: orderId });
      if (active) {
        setDone(Boolean(data));
        setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  const submit = async () => {
    if (rating < 1) {
      appToastError(t("reviewPickRating"));
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_order_review", {
        _order_id: orderId,
        _rating: rating,
        _comment: comment.trim() || null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "error");
      appToastSuccess(t("reviewThanks"));
      setDone(true);
    } catch (e) {
      appToastError(t("reviewFailed"));
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return null;

  if (done) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-5 text-center flex flex-col items-center gap-2">
        <CheckCircle2 className="w-8 h-8 text-success" />
        <p className="font-bold text-success">{t("reviewThanks")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-base font-black text-foreground">{t("reviewTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("reviewSubtitle")}</p>
      </div>

      <div className="flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-1 transition-transform active:scale-90"
              aria-label={`${n} estrellas`}
            >
              <Star
                className={`w-9 h-9 ${filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
              />
            </button>
          );
        })}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        placeholder={t("reviewCommentPlaceholder")}
        rows={3}
        className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <button
        onClick={submit}
        disabled={submitting || rating < 1}
        className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {t("reviewSubmit")}
      </button>
    </div>
  );
}
