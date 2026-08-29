import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
  Loader2,
  ShieldCheck,
  Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/store")({
  head: () => ({
    meta: [
      { title: "Campus Apparel Store — NutriFit" },
      { name: "description", content: "Student-crafted activewear, gym tees, and apparel with instant checkout." },
    ],
  }),
  component: StorePage,
});

interface StoreProduct {
  id: string;
  name: string;
  designer: string;
  campus: string;
  price_zar: number;
  category: string;
  description: string;
  sizes: string[];
  colors: string[];
  image_url: string;
  tag: string;
  created_at: string;
}

interface CartItem {
  product: StoreProduct;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}

const PAYPAL_CLIENT_ID = "BAAxTcLqIVHVERsaIBE05lJcQiNGux3xmiuizGZiBZpXnlQBt8LGnJW9ei9gVhtwzObCQmwZzt0VJ1Mw4I";

function StorePage() {
  const { user } = useAuth();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [selectedSizes, setSelectedSizes] = useState<{ [productId: string]: string }>({});
  const [selectedColors, setSelectedColors] = useState<{ [productId: string]: string }>({});

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [loadingPayPal, setLoadingPayPal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const paypalRenderedRef = useRef(false);

  useEffect(() => {
    fetchStoreProducts();
  }, []);

  const fetchStoreProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("store_products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProducts(data as StoreProduct[]);
      }
    } catch (err) {
      console.error("Failed to load store products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter(
    (p) => selectedCategory === "all" || p.category === selectedCategory
  );

  const cartTotalZAR = cart.reduce((sum, item) => sum + item.product.price_zar * item.quantity, 0);
  const cartTotalUSD = (cartTotalZAR / 18.5).toFixed(2);
  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (product: StoreProduct) => {
    const size = selectedSizes[product.id] || product.sizes[0] || "M";
    const color = selectedColors[product.id] || product.colors[0] || "Standard";

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedSize === size && item.selectedColor === color
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prev, { product, selectedSize: size, selectedColor: color, quantity: 1 }];
    });

    setIsCartOpen(true);
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!isCheckoutModalOpen) {
      paypalRenderedRef.current = false;
      return;
    }

    setLoadingPayPal(true);
    const containerId = "paypal-store-button-container";

    const renderPayPalButtons = () => {
      const container = document.getElementById(containerId);
      const paypal = (window as any).paypal;
      if (!paypal || !container || paypalRenderedRef.current) return;

      container.innerHTML = "";

      try {
        paypal
          .Buttons({
            style: {
              shape: "rect",
              color: "gold",
              layout: "vertical",
              label: "checkout",
            },
            createOrder: function (_data: any, actions: any) {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: cartTotalUSD,
                      currency_code: "USD",
                    },
                    description: `NutriFit Campus Apparel (${totalCartItemsCount} items)`,
                  },
                ],
              });
            },
            onApprove: async function (_data: any, actions: any) {
              await actions.order.capture();
              setPaymentSuccess(true);
              setCart([]);
              setTimeout(() => {
                setIsCheckoutModalOpen(false);
                setPaymentSuccess(false);
              }, 3000);
            },
            onError: function (err: any) {
              console.error("PayPal Error:", err);
              alert("Payment could not be completed. Please try again.");
            },
          })
          .render(`#${containerId}`);

        paypalRenderedRef.current = true;
      } catch (err) {
        console.error("PayPal render error:", err);
      } finally {
        setLoadingPayPal(false);
      }
    };

    if ((window as any).paypal) {
      renderPayPalButtons();
      return;
    }

    const scriptId = "paypal-sdk-store-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
      script.async = true;
      script.onload = () => renderPayPalButtons();
      document.body.appendChild(script);
    } else {
      script.addEventListener("load", renderPayPalButtons);
    }
  }, [isCheckoutModalOpen, cartTotalUSD, totalCartItemsCount]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-20 w-full px-1 sm:px-0">
      {/* 1. TOP HEADER & RIGHT-ALIGNED CART BAG BUTTON */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              Campus Store
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3 w-3 shrink-0" /> Student Made
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate sm:whitespace-normal mt-0.5">
            Locally designed gym wear &amp; student activewear.
          </p>
        </div>

        {/* TOP RIGHT CART BAG BUTTON */}
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="cursor-pointer relative inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-md transition shrink-0"
          aria-label="View shopping bag"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Bag</span>
          {totalCartItemsCount > 0 ? (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white text-emerald-700 font-mono font-black text-[10px] px-1 shadow-xs">
              {totalCartItemsCount}
            </span>
          ) : (
            <span className="sm:hidden text-[11px] font-mono font-bold">0</span>
          )}
        </button>
      </div>

      {/* 2. CATEGORY SELECTOR */}
      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`cursor-pointer rounded-2xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition capitalize ${
                selectedCategory === cat
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "all" ? "All Items" : cat}
            </button>
          ))}
        </div>
      )}

      {/* 3. PRODUCT CATALOG OR SHORT 'COMING SOON' CARD */}
      {loadingProducts ? (
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mr-2 shrink-0" /> Loading collection...
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 md:p-12 text-center max-w-xl mx-auto shadow-sm space-y-4">
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
            <Package className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3 w-3 shrink-0" /> New Drops In Progress
            </span>
            <h2 className="text-lg sm:text-2xl font-extrabold text-foreground tracking-tight">
              Fresh Campus Apparel Coming Soon!
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Our local student designers are preparing custom gym tees, pump covers, and activewear drops. Check back soon for the next release.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1 rounded-xl bg-muted/40 px-3 py-1.5 border border-border/60">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Student Made
            </span>
            <span className="flex items-center gap-1 rounded-xl bg-muted/40 px-3 py-1.5 border border-border/60">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Instant PayPal Checkout
            </span>
          </div>
        </div>
      ) : (
        /* DYNAMIC PRODUCT GRID */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col justify-between rounded-3xl border border-border bg-card overflow-hidden shadow-xs hover:shadow-md transition duration-200"
            >
              <div className="space-y-3">
                <div className="relative h-48 sm:h-56 w-full bg-muted overflow-hidden">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <span className="absolute top-3 left-3 rounded-xl bg-card/90 backdrop-blur-md border border-border/80 px-2.5 py-1 text-[10px] font-extrabold text-foreground shadow-xs">
                    {p.tag || "Official Drop"}
                  </span>
                  <span className="absolute bottom-3 left-3 rounded-xl bg-black/75 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white">
                    By {p.designer} • {p.campus}
                  </span>
                </div>

                <div className="p-4 sm:p-5 pb-0 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-foreground group-hover:text-emerald-500 transition line-clamp-1">
                      {p.name}
                    </h3>
                    <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                      R{p.price_zar}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>

                  {/* Size Options */}
                  {p.sizes && p.sizes.length > 0 && (
                    <div className="pt-2 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Select Size
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.sizes.map((s) => {
                          const isSelected = (selectedSizes[p.id] || p.sizes[0]) === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSelectedSizes((prev) => ({ ...prev, [p.id]: s }))}
                              className={`cursor-pointer rounded-xl px-2.5 py-1 text-[11px] font-extrabold transition border ${
                                isSelected
                                  ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Colour Options */}
                  {p.colors && p.colors.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Colour: <span className="text-foreground">{selectedColors[p.id] || p.colors[0]}</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.colors.map((c) => {
                          const isSelected = (selectedColors[p.id] || p.colors[0]) === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSelectedColors((prev) => ({ ...prev, [p.id]: c }))}
                              className={`cursor-pointer rounded-xl px-2.5 py-0.5 text-[10px] font-bold transition border ${
                                isSelected
                                  ? "bg-card text-foreground border-emerald-500 shadow-xs"
                                  : "bg-muted/40 border-border text-muted-foreground"
                              }`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 pt-3">
                <button
                  type="button"
                  onClick={() => handleAddToCart(p)}
                  className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-xs font-extrabold shadow-sm transition active:scale-95"
                >
                  <ShoppingBag className="h-4 w-4 shrink-0" />
                  <span>Add to Bag • R{p.price_zar}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. SLIDE-OVER BAG / CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md h-full bg-card border-l border-border p-4 sm:p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-emerald-500 shrink-0" />
                  <h2 className="text-base sm:text-lg font-extrabold text-foreground">Your Order Bag</h2>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    {totalCartItemsCount} item{totalCartItemsCount === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-xl text-muted-foreground hover:bg-muted shrink-0 cursor-pointer"
                >
                  <X className="h-5 w-5 shrink-0" />
                </button>
              </div>

              <div className="py-3 space-y-2.5 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                    <ShoppingBag className="h-8 w-8 mx-auto text-emerald-500 opacity-40 shrink-0" />
                    <p className="font-bold text-foreground">Your bag is empty</p>
                    <p>Add some campus activewear to begin checkout.</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl border border-border/70 bg-background/50"
                    >
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">{item.product.name}</h4>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">
                          {item.selectedSize} • {item.selectedColor}
                        </p>
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          R{item.product.price_zar * item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, -1)}
                            className="p-1 hover:text-foreground text-muted-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-extrabold px-1 font-mono">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, 1)}
                            className="p-1 hover:text-foreground text-muted-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(idx)}
                          className="p-1 text-muted-foreground hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border-t border-border/70 pt-3 space-y-2.5">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-bold text-foreground font-mono">R{cartTotalZAR}.00</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Campus Pickup</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-foreground pt-1 border-t border-border/50">
                    <span>Total</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                      R{cartTotalZAR}.00 <span className="text-[10px] text-muted-foreground font-normal">(~${cartTotalUSD} USD)</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(true)}
                  className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-600 active:scale-95 transition"
                >
                  <span>Instant PayPal Checkout</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PAYPAL CHECKOUT MODAL */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                <h3 className="text-base font-extrabold text-foreground">Order Checkout</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted shrink-0 cursor-pointer"
              >
                <X className="h-5 w-5 shrink-0" />
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="font-extrabold text-foreground">Payable Amount:</span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  R{cartTotalZAR}.00 <span className="text-xs text-muted-foreground">(${cartTotalUSD} USD)</span>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pay securely using PayPal or your Debit/Credit Card.
              </p>
            </div>

            {paymentSuccess ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-extrabold text-foreground">Payment Received!</h4>
                <p className="text-xs text-muted-foreground">
                  Your campus collection code and receipt have been dispatched.
                </p>
              </div>
            ) : (
              <div className="pt-2 min-h-[50px] flex flex-col items-center justify-center">
                {loadingPayPal && (
                  <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />
                    <span>Connecting secure payment...</span>
                  </div>
                )}
                <div id="paypal-store-button-container" className="w-full" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StorePage;