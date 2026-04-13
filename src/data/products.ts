import burger1 from "@/assets/burger1.png";
import burger2 from "@/assets/burger2.png";
import chicken from "@/assets/chicken.png";
import fries from "@/assets/fries.png";
import drink from "@/assets/drink.png";
import dessert from "@/assets/dessert.png";
import combo from "@/assets/combo.png";
import veggie from "@/assets/veggie.png";

export interface Product {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  price: number;
  image: string;
  category: string;
  isBestseller?: boolean;
  isPromo?: boolean;
  extras?: Extra[];
  sizes?: Size[];
}

export interface Extra {
  id: string;
  name: Record<string, string>;
  price: number;
}

export interface Size {
  id: string;
  name: Record<string, string>;
  priceAdd: number;
}

export interface Category {
  id: string;
  name: Record<string, string>;
  image: string;
  icon: string;
}

export const categories: Category[] = [
  { id: "combos", name: { pt: "Combos", en: "Combos", es: "Combos", fr: "Combos" }, image: combo, icon: "🍔" },
  { id: "burgers", name: { pt: "Hambúrgueres", en: "Burgers", es: "Hamburguesas", fr: "Burgers" }, image: burger1, icon: "🥩" },
  { id: "chicken", name: { pt: "Frango", en: "Chicken", es: "Pollo", fr: "Poulet" }, image: chicken, icon: "🍗" },
  { id: "sides", name: { pt: "Acompanhamentos", en: "Sides", es: "Complementos", fr: "Accompagnements" }, image: fries, icon: "🍟" },
  { id: "drinks", name: { pt: "Bebidas", en: "Drinks", es: "Bebidas", fr: "Boissons" }, image: drink, icon: "🥤" },
  { id: "desserts", name: { pt: "Sobremesas", en: "Desserts", es: "Postres", fr: "Desserts" }, image: dessert, icon: "🍦" },
  { id: "veggie", name: { pt: "Vegetariano", en: "Vegetarian", es: "Vegetariano", fr: "Végétarien" }, image: veggie, icon: "🥬" },
];

const defaultExtras: Extra[] = [
  { id: "bacon", name: { pt: "Bacon", en: "Bacon", es: "Bacon", fr: "Bacon" }, price: 2.50 },
  { id: "cheese", name: { pt: "Queijo Extra", en: "Extra Cheese", es: "Queso Extra", fr: "Fromage Sup." }, price: 1.50 },
  { id: "egg", name: { pt: "Ovo", en: "Egg", es: "Huevo", fr: "Œuf" }, price: 1.50 },
  { id: "sauce", name: { pt: "Molho Especial", en: "Special Sauce", es: "Salsa Especial", fr: "Sauce Spéciale" }, price: 0.75 },
];

const defaultSizes: Size[] = [
  { id: "normal", name: { pt: "Normal", en: "Regular", es: "Normal", fr: "Normal" }, priceAdd: 0 },
  { id: "large", name: { pt: "Grande", en: "Large", es: "Grande", fr: "Grand" }, priceAdd: 3.00 },
];

export const products: Product[] = [
  {
    id: "classic-burger",
    name: { pt: "Classic Burger", en: "Classic Burger", es: "Hamburguesa Clásica", fr: "Burger Classique" },
    description: { pt: "Pão, carne 100% bovina, queijo, alface, tomate e molho especial", en: "Bun, 100% beef, cheese, lettuce, tomato, special sauce", es: "Pan, carne 100% vacuno, queso, lechuga, tomate y salsa especial", fr: "Pain, bœuf 100%, fromage, laitue, tomate, sauce spéciale" },
    price: 8.90,
    image: burger1,
    category: "burgers",
    isBestseller: true,
    extras: defaultExtras,
    sizes: defaultSizes,
  },
  {
    id: "double-bacon",
    name: { pt: "Double Bacon", en: "Double Bacon", es: "Doble Bacon", fr: "Double Bacon" },
    description: { pt: "Dois hambúrgueres, bacon crocante, queijo cheddar derretido", en: "Two patties, crispy bacon, melted cheddar cheese", es: "Dos hamburguesas, bacon crujiente, queso cheddar fundido", fr: "Deux steaks, bacon croustillant, cheddar fondu" },
    price: 14.90,
    image: burger2,
    category: "burgers",
    isBestseller: true,
    isPromo: true,
    extras: defaultExtras,
    sizes: defaultSizes,
  },
  {
    id: "crispy-chicken",
    name: { pt: "Crispy Chicken", en: "Crispy Chicken", es: "Pollo Crujiente", fr: "Poulet Croustillant" },
    description: { pt: "Frango empanado crocante com alface e molho", en: "Crispy breaded chicken with lettuce and sauce", es: "Pollo empanado crujiente con lechuga y salsa", fr: "Poulet pané croustillant avec laitue et sauce" },
    price: 10.90,
    image: chicken,
    category: "chicken",
    extras: defaultExtras,
    sizes: defaultSizes,
  },
  {
    id: "combo-classic",
    name: { pt: "Combo Clássico", en: "Classic Combo", es: "Combo Clásico", fr: "Combo Classique" },
    description: { pt: "Classic Burger + Batata Média + Refrigerante", en: "Classic Burger + Medium Fries + Soft Drink", es: "Hamburguesa Clásica + Patatas Medianas + Refresco", fr: "Burger Classique + Frites Moyennes + Boisson" },
    price: 19.90,
    image: combo,
    category: "combos",
    isBestseller: true,
    isPromo: true,
    extras: defaultExtras,
    sizes: defaultSizes,
  },
  {
    id: "fries-medium",
    name: { pt: "Batata Frita", en: "French Fries", es: "Patatas Fritas", fr: "Frites" },
    description: { pt: "Batatas fritas crocantes e douradas", en: "Crispy golden fries", es: "Patatas fritas crujientes y doradas", fr: "Frites croustillantes et dorées" },
    price: 6.90,
    image: fries,
    category: "sides",
    extras: [],
    sizes: [
      { id: "small", name: { pt: "Pequena", en: "Small", es: "Pequeña", fr: "Petite" }, priceAdd: -1.50 },
      { id: "normal", name: { pt: "Média", en: "Medium", es: "Mediana", fr: "Moyenne" }, priceAdd: 0 },
      { id: "large", name: { pt: "Grande", en: "Large", es: "Grande", fr: "Grande" }, priceAdd: 2.00 },
    ],
  },
  {
    id: "cola",
    name: { pt: "Refrigerante", en: "Soft Drink", es: "Refresco", fr: "Boisson" },
    description: { pt: "Refrigerante gelado com gelo", en: "Cold soft drink with ice", es: "Refresco frío con hielo", fr: "Boisson fraîche avec glace" },
    price: 4.90,
    image: drink,
    category: "drinks",
    extras: [],
    sizes: [
      { id: "normal", name: { pt: "Normal", en: "Regular", es: "Normal", fr: "Normal" }, priceAdd: 0 },
      { id: "large", name: { pt: "Grande", en: "Large", es: "Grande", fr: "Grand" }, priceAdd: 1.50 },
    ],
  },
  {
    id: "sundae",
    name: { pt: "Sundae Chocolate", en: "Chocolate Sundae", es: "Sundae de Chocolate", fr: "Sundae Chocolat" },
    description: { pt: "Sorvete de baunilha com calda de chocolate", en: "Vanilla ice cream with chocolate sauce", es: "Helado de vainilla con salsa de chocolate", fr: "Glace vanille avec sauce chocolat" },
    price: 5.90,
    image: dessert,
    category: "desserts",
    extras: [],
    sizes: defaultSizes,
  },
  {
    id: "veggie-burger",
    name: { pt: "Veggie Burger", en: "Veggie Burger", es: "Hamburguesa Vegetal", fr: "Burger Végétarien" },
    description: { pt: "Hambúrguer vegetal com abacate, alface e tomate", en: "Plant-based patty with avocado, lettuce and tomato", es: "Hamburguesa vegetal con aguacate, lechuga y tomate", fr: "Steak végétal avec avocat, laitue et tomate" },
    price: 12.90,
    image: veggie,
    category: "veggie",
    extras: [
      { id: "cheese", name: { pt: "Queijo Extra", en: "Extra Cheese", es: "Queso Extra", fr: "Fromage Sup." }, price: 1.50 },
      { id: "sauce", name: { pt: "Molho Especial", en: "Special Sauce", es: "Salsa Especial", fr: "Sauce Spéciale" }, price: 0.75 },
    ],
    sizes: defaultSizes,
  },
];

export const upsellProducts = [
  products.find(p => p.id === "fries-medium")!,
  products.find(p => p.id === "cola")!,
  products.find(p => p.id === "sundae")!,
];
