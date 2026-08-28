import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/** Primary action button. Emerald filled. */
export function PrimaryButton({ children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={
        'bg-emerald-900 hover:bg-emerald-950 disabled:bg-stone-300 disabled:cursor-not-allowed ' +
        'text-white font-medium px-6 py-3 rounded-md transition-colors ' +
        className
      }
    >
      {children}
    </button>
  );
}

/** Secondary action button. Outlined, neutral. */
export function SecondaryButton({ children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={
        'bg-white border border-stone-300 hover:border-stone-400 text-stone-700 ' +
        'font-medium px-6 py-3 rounded-md transition-colors ' +
        className
      }
    >
      {children}
    </button>
  );
}
