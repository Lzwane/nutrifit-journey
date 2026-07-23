import logoAsset from "@/assets/nutrifit-logo.jpg.asset.json";

export function NutriFitLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="NutriFit logo"
      className={`${className} rounded-xl object-cover`}
    />
  );
}

export function NutriFitWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <NutriFitLogo className="h-9 w-9" />
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-xl font-extrabold tracking-tight">
            <span style={{ color: "var(--brand-green)" }}>Nutri</span>
            <span style={{ color: "var(--brand-orange)" }}>Fit</span>
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Nutrition &amp; Fitness
          </span>
        </div>
      )}
    </div>
  );
}
