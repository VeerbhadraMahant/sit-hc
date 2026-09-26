import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-smallcards bg-paper px-4 text-ink shadow-field placeholder:text-pewter/70 focus:outline-2 focus:outline-offset-1 focus:outline-cobalt disabled:opacity-60";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-40 resize-y py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, "h-12 cursor-pointer", className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-2 block text-sm font-medium text-ink", className)} {...props} />;
}
