import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PayPalSubscriptionButtonProps {
  userId: string;
  onSuccess: () => void;
  onError?: (err: any) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const PAYPAL_CLIENT_ID =
  "BAAxTcLqIVHVERsaIBE05lJcQiNGux3xmiuizGZiBZpXnlQBt8LGnJW9ei9gVhtwzObCQmwZzt0VJ1Mw4I";
const PAYPAL_PLAN_ID = "P-7V56155591696325CNKDKF2Q";
const CONTAINER_ID = `paypal-button-container-${PAYPAL_PLAN_ID}`;

export function PayPalSubscriptionButton({
  userId,
  onSuccess,
  onError,
}: PayPalSubscriptionButtonProps) {
  const [loadingSdk, setLoadingSdk] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    const scriptId = "paypal-sdk-script";

    const renderButtons = () => {
      if (!window.paypal || !containerRef.current || renderedRef.current) return;

      // Clear any prior renders in container
      containerRef.current.innerHTML = "";

      try {
        window.paypal
          .Buttons({
            style: {
              shape: "rect",
              color: "silver",
              layout: "vertical",
              label: "subscribe",
            },
            createSubscription: function (_data: any, actions: any) {
              return actions.subscription.create({
                plan_id: PAYPAL_PLAN_ID,
                custom_id: userId,
              });
            },
            onApprove: async function (data: any) {
              const nextBilling = new Date();
              nextBilling.setDate(nextBilling.getDate() + 30);

              // Update user profile in Supabase to active premium
              await supabase
                .from("profiles")
                .update({
                  subscription_tier: "premium",
                  subscription_status: "active",
                  next_billing_date: nextBilling.toISOString(),
                  card_brand: "PayPal Subscription",
                  card_last_four: (data.subscriptionID || "PAYPAL").slice(-4),
                } as any)
                .eq("id", userId);

              onSuccess();
            },
            onError: function (err: any) {
              console.error("PayPal subscription error:", err);
              if (onError) onError(err);
            },
          })
          .render(`#${CONTAINER_ID}`);

        renderedRef.current = true;
      } catch (e) {
        console.error("Failed to render PayPal buttons:", e);
      } finally {
        setLoadingSdk(false);
      }
    };

    if (window.paypal) {
      setLoadingSdk(false);
      renderButtons();
      return;
    }

    // Check if script already injected
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
      script.setAttribute("data-sdk-integration-source", "button-factory");
      script.async = true;

      script.onload = () => {
        setLoadingSdk(false);
        renderButtons();
      };

      document.body.appendChild(script);
    } else {
      script.addEventListener("load", () => {
        setLoadingSdk(false);
        renderButtons();
      });
    }

    return () => {
      renderedRef.current = false;
    };
  }, [userId, onSuccess, onError]);

  return (
    <div className="w-full flex flex-col items-center">
      {loadingSdk && (
        <div className="flex items-center justify-center p-4 text-xs text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading secure PayPal checkout...</span>
        </div>
      )}
      <div id={CONTAINER_ID} ref={containerRef} className="w-full min-h-[50px]" />
    </div>
  );
}