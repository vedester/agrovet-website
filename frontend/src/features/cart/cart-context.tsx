"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "agrovet-storefront-cart-v1";

export type CartItem = {
  productId: number;
  name: string;
  slug: string;
  sku: string;
  packSize: string;
  unitPriceCents: number;
  priceLabel: string;
  image: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  hydrated: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is CartItem =>
        Boolean(
          item &&
            typeof item === "object" &&
            Number.isSafeInteger(item.productId) &&
            typeof item.name === "string" &&
            typeof item.slug === "string" &&
            typeof item.sku === "string" &&
            typeof item.packSize === "string" &&
            Number.isSafeInteger(item.unitPriceCents) &&
            item.unitPriceCents >= 0 &&
            typeof item.priceLabel === "string" &&
            (item.image === null || typeof item.image === "string") &&
            Number.isSafeInteger(item.quantity) &&
            item.quantity > 0,
        ),
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;

      setItems(readStoredCart());
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // The cart remains usable for this session if browser storage is unavailable.
    }
  }, [hydrated, items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      setItems((current) => {
        const existing = current.find(
          (entry) => entry.productId === item.productId,
        );

        if (existing) {
          return current.map((entry) =>
            entry.productId === item.productId
              ? { ...entry, ...item, quantity: entry.quantity + quantity }
              : entry,
          );
        }

        return [...current, { ...item, quantity }];
      });
    },
    [],
  );

  const updateQuantity = useCallback(
    (productId: number, quantity: number) => {
      setItems((current) =>
        quantity <= 0
          ? current.filter((item) => item.productId !== productId)
          : current.map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.min(quantity, 10000) }
                : item,
            ),
      );
    },
    [],
  );

  const removeItem = useCallback((productId: number) => {
    setItems((current) =>
      current.filter((item) => item.productId !== productId),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      subtotalCents: items.reduce(
        (total, item) => total + item.unitPriceCents * item.quantity,
        0,
      ),
      hydrated,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      hydrated,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider.");
  }

  return context;
}
