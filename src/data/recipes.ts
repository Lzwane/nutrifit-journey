export interface LocalRecipe {
  id: string;
  title: string;
  description: string;
  prep_minutes: number;
  cook_minutes: number;
  servings: number;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  category: string;
  ingredients?: { item: string; amount: string }[];
  instructions?: string[];
}


export const POPULAR_RECIPES = [
  {
    id: "samp-and-beans-beef",
    title: "High-Protein Umngqusho (Samp & Beans) with Beef",
    description: "Traditional slow-cooked Xhosa samp and sugar beans served with tender braised lean beef stew.",
    prep_minutes: 15,
    cook_minutes: 45,
    servings: 1,
    calories_per_serving: 540,
    protein_g: 45,
    carbs_g: 58,
    fat_g: 10,
    fiber_g: 12,
    category: "Traditional",
  },
  {
    id: "chakalaka-chicken-breast",
    title: "Chakalaka Pan-Seared Chicken & Brown Rice",
    description: "Juicy chicken breast topped with spicy homemade vegetable chakalaka over brown rice.",
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 1,
    calories_per_serving: 480,
    protein_g: 46,
    carbs_g: 44,
    fat_g: 11,
    fiber_g: 6,
    category: "High Protein",
  },
  {
    id: "pilchards-fish-cakes",
    title: "Crispy Pilchard & Potato Fish Cakes",
    description: "Budget-friendly, high-protein fish cakes made with canned pilchards in tomato sauce and potato.",
    prep_minutes: 10,
    cook_minutes: 12,
    servings: 2,
    calories_per_serving: 360,
    protein_g: 35,
    carbs_g: 28,
    fat_g: 12,
    fiber_g: 4,
    category: "Budget Friendly",
  },
  {
    id: "boerewors-sweet-potato-skillet",
    title: "Lean Boerewors & Sweet Potato Skillet",
    description: "Sizzling lean beef boerewors grilled with roasted sweet potato cubes, onions, and green peppers.",
    prep_minutes: 10,
    cook_minutes: 18,
    servings: 1,
    calories_per_serving: 510,
    protein_g: 38,
    carbs_g: 42,
    fat_g: 18,
    fiber_g: 5,
    category: "Dinner",
  },
];