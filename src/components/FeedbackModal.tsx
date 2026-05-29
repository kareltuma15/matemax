"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onSubmit: (rating: number, liked: string[], suggestion: string) => Promise<void>;
}

const LIKED_OPTIONS = [
  { id: "vysvetleni", label: "Vysvětlení příkladů" },
  { id: "progress", label: "Přehled pokroku" },
  { id: "gamifikace", label: "Odměny a streak" },
  { id: "obtiznost", label: "Přiměřená obtížnost" },
  { id: "jednoduchost", label: "Jednoduchá obsluha" },
];

export default function FeedbackModal({ onClose, onSubmit }: Props) {
  const [step, setStep] = useState<"rating" | "liked" | "suggestion" | "thanks">("rating");
  const [rating, setRating]       = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [liked, setLiked]         = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleLiked(id: string) {
    setLiked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    await onSubmit(rating, liked, suggestion);
    setStep("thanks");
    setSubmitting(false);
    setTimeout(onClose, 2200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-overlay">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden modal-spring">

        {step === "thanks" ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🙏</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Díky za zpětnou vazbu!</h2>
            <p className="text-gray-500 text-sm">Pomáhá nám zlepšovat MateMax pro tebe.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                    Rychlá zpětná vazba · {step === "rating" ? "1/3" : step === "liked" ? "2/3" : "3/3"}
                  </p>
                  <h2 className="text-lg font-bold text-gray-900">
                    {step === "rating" && "Jak se ti MateMax líbí?"}
                    {step === "liked" && "Co oceňuješ nejvíce?"}
                    {step === "suggestion" && "Co bys zlepšil/a?"}
                  </h2>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 mt-0.5 flex-shrink-0">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              {step === "rating" && (
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="text-4xl transition-transform hover:scale-110 active:scale-95"
                    >
                      {star <= (hoverRating || rating) ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              )}

              {step === "liked" && (
                <div className="grid grid-cols-1 gap-2">
                  {LIKED_OPTIONS.map((opt) => {
                    const selected = liked.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleLiked(opt.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                          selected ? "bg-blue-500" : "border-2 border-gray-300"
                        }`}>
                          {selected && (
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {step === "suggestion" && (
                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="Nemusíš psát nic, ale každý nápad pomáhá 🙂"
                  rows={4}
                  maxLength={500}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none"
                />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              {step !== "rating" && (
                <button
                  onClick={() => setStep(step === "liked" ? "rating" : "liked")}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors"
                >
                  Zpět
                </button>
              )}
              <button
                onClick={() => {
                  if (step === "rating") {
                    if (rating === 0) return;
                    setStep("liked");
                  } else if (step === "liked") {
                    setStep("suggestion");
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={step === "rating" && rating === 0 || submitting}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                {step === "suggestion" ? (submitting ? "Odesílám…" : "Odeslat") : "Další →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
