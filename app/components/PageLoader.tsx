import { LoaderCircle } from "lucide-react";

export function PageLoader({
  title = "Loading",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-950 text-white shadow-[0_18px_34px_rgba(15,23,42,0.18)]">
        <LoaderCircle className="h-7 w-7 animate-spin" />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-zinc-950">{title}</h2>
      {message && <p className="mt-3 max-w-md text-sm leading-6 text-zinc-600">{message}</p>}
    </div>
  );
}
