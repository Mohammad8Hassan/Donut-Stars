import { Bike, CheckCircle2, ChefHat, Package, XCircle } from "lucide-react";

// Canonical animated icon for an order's status — used by the navbar's
// ActiveOrdersStrip and by app/account/active-orders/page.tsx so both places
// show the same visual language instead of two hand-rolled versions.
// "preparing" and "out_for_delivery" get distinct animations; everything
// else (completed/cancelled/unknown) is a static icon so this stays safe to
// reuse anywhere an order status shows up, not just the active-only views.
type Props = {
  status: string;
  size?: "sm" | "md" | "lg";
};

// "sm" (dropdown rows) skips the ping ring — several of them animating at
// once in a list reads as noisy rather than attention-grabbing.
const SIZES = {
  sm: { circle: "h-8 w-8", icon: "h-4 w-4", ping: false },
  md: { circle: "h-12 w-12", icon: "h-6 w-6", ping: true },
  lg: { circle: "h-14 w-14", icon: "h-7 w-7", ping: true },
};

export default function OrderStatusAnimation({ status, size = "md" }: Props) {
  const { circle, icon, ping } = SIZES[size];

  if (status === "preparing") {
    return (
      <div className={`relative flex ${circle} shrink-0 items-center justify-center rounded-full bg-orange-50`}>
        {ping && <span className="absolute inset-0 rounded-full bg-orange-300/50 animate-ping" />}
        <span
          className="absolute top-0 left-[35%] h-1.5 w-1.5 rounded-full bg-orange-300 animate-steam"
          style={{ animationDelay: "0s" }}
        />
        <span
          className="absolute top-0 left-[55%] h-1 w-1 rounded-full bg-orange-300 animate-steam"
          style={{ animationDelay: "0.5s" }}
        />
        <ChefHat className={`${icon} relative animate-bob text-orange-600`} strokeWidth={2.2} />
      </div>
    );
  }

  if (status === "out_for_delivery") {
    return (
      <div className={`relative flex ${circle} shrink-0 items-center justify-center rounded-full bg-violet-50`}>
        {ping && <span className="absolute inset-0 rounded-full bg-violet-300/50 animate-ping" />}
        <Bike className={`${icon} relative animate-ride text-violet-600`} strokeWidth={2.2} />
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className={`flex ${circle} shrink-0 items-center justify-center rounded-full bg-emerald-50`}>
        <CheckCircle2 className={`${icon} text-emerald-600`} strokeWidth={2.2} />
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className={`flex ${circle} shrink-0 items-center justify-center rounded-full bg-rose-50`}>
        <XCircle className={`${icon} text-rose-600`} strokeWidth={2.2} />
      </div>
    );
  }

  return (
    <div className={`flex ${circle} shrink-0 items-center justify-center rounded-full bg-gray-50`}>
      <Package className={`${icon} text-gray-600`} strokeWidth={2.2} />
    </div>
  );
}
