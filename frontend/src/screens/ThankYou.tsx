import { CheckCircle2 } from 'lucide-react';

export function ThankYou() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <CheckCircle2 size={56} className="text-emerald-900 mx-auto mb-6" strokeWidth={1.5} />
      <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 mb-4">
        Thank you.
      </h1>
      <p className="text-lg text-stone-600 leading-relaxed max-w-xl mx-auto mb-10">
        Your recordings have been saved. You can close this window now.
      </p>
      <div className="text-xs text-stone-400">
        Research prototype • Not for clinical use
      </div>
    </div>
  );
}
