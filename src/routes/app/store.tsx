import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Tag,
  ArrowRight,
  X,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/store")({
  head: () => ({
    meta: [
      { title: "Campus Fitness Store — NutriFit" },
      { name: "description", content: "Student-crafted activewear, gym tees, and apparel with instant checkout." },
    ],
  }),
  component: StorePage,
});

interface Product {
  id: string;
  name: string;
  designer: string;
  campus: string;
  priceZAR: number;
  category: "tees" | "hoodies" | "shorts" | "accessories";
  description: string;
  sizes: string[];
  colors: string[];
  imageUrl: string;
  tag: string;
}

interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}

const LOCAL_STUDENT_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "SMU Varsity Oversized Gym Tee",
    designer: "Kagiso M.",
    campus: "SMU Campus",
    priceZAR: 249,
    category: "tees",
    description: "Heavyweight 240gsm breathable cotton tailored for intense lifting sessions and streetwear style.",
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: ["Jet Black", "Forest Green", "Vintage Cream"],
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=60",
    tag: "Campus Bestseller",
  },
  {
    id: "prod-2",
    name: "Ga-Rankuwa Pump Cover Pullover",
    designer: "Lethabo Z.",
    campus: "Tshwane Student Guild",
    priceZAR: 449,
    category: "hoodies",
    description: "Fleece-lined thermal hoodie designed to trap heat during pre-workout warmup and early outdoor runs.",
    sizes: ["M", "L", "XL", "2XL"],
    colors: ["Charcoal Grey", "Olive Green"],
    imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=60",
    tag: "New Arrival",
  },
  {
    id: "prod-3",
    name: "Pretoria Core Mesh Training Shorts",
    designer: "Sipho D.",
    campus: "Pretoria West",
    priceZAR: 199,
    category: "shorts",
    description: "5-inch inseam ultra-light double layer performance mesh with deep zip-secure phone pockets.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Midnight Blue", "Matte Black"],
    imageUrl: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop&q=60",
    tag: "High Demand",
  },
  {
    id: "prod-4",
    name: "NutriFit Compression Muscle Vest",
    designer: "Thabo K.",
    campus: "Medunsa Athletic Club",
    priceZAR: 179,
    category: "tees",
    description: "Sweat-wicking ribbed elastane blend engineered for maximum upper-body ventilation.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Classic White", "Pitch Black"],
    imageUrl: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=60",
    tag: "Athletic Cut",
  },
  {
    id: "prod-5",
    name: "Unisex High-Rise Gym Leggings",
    designer: "Nomvula S.",
    campus: "SMU Health Guild",
    priceZAR: 299,
    category: "shorts",
    description: "Seamless squat-proof compression leggings featuring a high-waist band and side holster pockets.",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Forest Green", "Espresso"],
    imageUrl: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&auto=format&fit=crop&q=60",
    tag: "Squat Proof",
  },
  {
    id: "prod-6",
    name: "Heritage Lifting Grip Straps & Wrist Wraps",
    designer: "Vuyo N.",
    campus: "Pretoria Gym Lab",
    priceZAR: 129,
    category: "accessories",
    description: "Reinforced dual-stitched neoprene padded wrist wraps built for heavy deadlifts and compound pulling.",
    sizes: ["One Size"],
    colors: ["Emerald / Gold", "All Black"],
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=60",
    tag: "Heavy Duty",
  },
];

const PAYPAL_CLIENT_ID = "BAAxTcLqIVHVERsaIBE05lJcQiNGux3xmiuizGZiBZpXnlQBt8LGnJW9ei9gVhtwzObCQmwZzt0VJ1Mw4I";

function StorePage() {
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<{ [productId: string]: string }>({
    "prod-1": "L",
    "prod-2": "L",
    "prod-3": "M",
    "prod-4": "M",
    "prod-5": "S",
    "prod-6": "One Size",
  });
  const [selectedColors, setSelectedColors] = useState<{ [productId: string]: string }>({
    "prod-1": "Jet Black",
    "prod-2": "Charcoal Grey",
    "prod-3": "Matte Black",
    "prod-4": "Classic White",
    "prod-5": "Forest Green",
    "prod-6": "All Black",
  });

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [loadingPayPal, setLoadingPayPal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const paypalRenderedRef = useRef(false);

  const filteredProducts = LOCAL_STUDENT_PRODUCTS.filter(
    (p) => selectedCategory === "all" || p.category === selectedCategory
  );

  const cartTotalZAR = cart.reduce((sum, item) => sum + item.product.priceZAR * item.quantity, 0);
  const cartTotalUSD = (cartTotalZAR / 18.5).toFixed(2); // Approximate conversion for PayPal standard capture
  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (product: Product) => {
    const size = selectedSizes[product.id] || product.sizes[0];
    const color = selectedColors[product.id] || product.colors[0];

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
                    description: `NutriFit Student Apparel Checkout (${totalCartItemsCount} items)`,
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
              alert("Payment could not be processed. Please verify details.");
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
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16 w-full">
      {/* STORE HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Campus Fitness Apparel
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3 w-3 shrink-0" /> Student Made
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Support student designers and gym creators with verified local performance wear.
          </p>
        </div>

        {/* CART FLOATING PILL */}
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="cursor-pointer relative inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-600 active:scale-95 transition shrink-0"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          <span>My Bag ({totalCartItemsCount})</span>
          {totalCartItemsCount > 0 && (
            <span className="rounded-full bg-white text-emerald-700 px-2 py-0.5 text-[10px] font-black font-mono">
              R{cartTotalZAR}
            </span>
          )}
        </button>
      </div>

      {/* CATEGORY SELECTOR */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: "all", label: "All Items" },
          { id: "tees", label: "T-Shirts & Tanks" },
          { id: "hoodies", label: "Hoodies & Pump Covers" },
          { id: "shorts", label: "Shorts & Bottoms" },
          { id: "accessories", label: "Lifting Gear" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id)}
            className={`cursor-pointer rounded-2xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition ${
              selectedCategory === tab.id
                ? "bg-emerald-500 text-white shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PRODUCT GRID */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className="group flex flex-col justify-between rounded-3xl border border-border bg-card overflow-hidden shadow-xs hover:shadow-md transition duration-200"
          >
            <div className="space-y-3">
              {/* Product Photo & Badge */}
              <div className="relative h-56 w-full bg-muted overflow-hidden">
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 left-3 rounded-xl bg-card/90 backdrop-blur-md border border-border/80 px-2.5 py-1 text-[10px] font-extrabold text-foreground shadow-xs">
                  {p.tag}
                </span>
                <span className="absolute bottom-3 left-3 rounded-xl bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white">
                  By {p.designer} • {p.campus}
                </span>
              </div>

              {/* Title & Info */}
              <div className="p-5 pb-0 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-extrabold text-foreground group-hover:text-emerald-500 transition line-clamp-1">
                    {p.name}
                  </h3>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                    R{p.priceZAR}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {p.description}
                </p>

                {/* Size Options */}
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

                {/* Color Options */}
                <div className="pt-1 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Color: <span className="text-foreground">{selectedColors[p.id] || p.colors[0]}</span>
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
              </div>
            </div>

            {/* Add to Tab Button */}
            <div className="p-5 pt-4">
              <button
                type="button"
                onClick={() => handleAddToCart(p)}
                className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-xs font-extrabold shadow-sm transition active:scale-95"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <span>Add to Bag • R{p.priceZAR}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SLIDE-OVER BAG / CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md h-full bg-card border-l border-border p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Cart Header */}
            <div>
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-emerald-500 shrink-0" />
                  <h2 className="text-lg font-extrabold text-foreground">Your Order Bag</h2>
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

              {/* Items List */}
              <div className="py-4 space-y-3 max-h-[58vh] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="p-10 text-center text-xs text-muted-foreground space-y-2">
                    <ShoppingBag className="h-8 w-8 mx-auto text-emerald-500 opacity-40 shrink-0" />
                    <p className="font-bold text-foreground">Your bag is empty</p>
                    <p>Add some student-branded clothes from the catalog to checkout.</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/70 bg-background/50"
                    >
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="h-14 w-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">{item.product.name}</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {item.selectedSize} • {item.selectedColor}
                        </p>
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          R{item.product.priceZAR * item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
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
                          className="p-1.5 text-muted-foreground hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t border-border/70 pt-4 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-bold text-foreground font-mono">R{cartTotalZAR}.00</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Campus Pickup / Delivery</span>
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

      {/* INSTANT PAYPAL CHECKOUT POPUP MODAL */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                <h3 className="text-base font-extrabold text-foreground">Complete Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted shrink-0 cursor-pointer"
              >
                <X className="h-5 w-5 shrink-0" />
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="font-extrabold text-foreground">Total Payable:</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  R{cartTotalZAR}.00 <span className="text-xs text-muted-foreground">(${cartTotalUSD} USD)</span>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Supporting {totalCartItemsCount} student creation{totalCartItemsCount === 1 ? "" : "s"}. Instant payment with PayPal Wallet or Card.
              </p>
            </div>

            {paymentSuccess ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-extrabold text-foreground">Order Paid Successfully!</h4>
                <p className="text-xs text-muted-foreground">
                  Your receipt and campus collection details have been sent to your email.
                </p>
              </div>
            ) : (
              <div className="pt-2 min-h-[50px] flex flex-col items-center justify-center">
                {loadingPayPal && (
                  <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />
                    <span>Loading secure payment buttons...</span>
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