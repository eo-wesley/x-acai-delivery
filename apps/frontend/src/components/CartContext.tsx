'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Each selected option in a modifier group
export interface SelectedOption {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    price_cents: number; // additional price
}

export interface CouponState {
    code: string;
    discountCents: number;
}

export interface CartItem {
    cartKey: string;           // unique key = menuItemId + JSON(selected_options)
    menuItemId: string;
    name: string;
    base_price_cents: number;  // base product price (without modifiers)
    price_cents: number;       // final price per unit (base + all modifier prices)
    qty: number;
    notes?: string;
    selected_options?: SelectedOption[]; // chosen modifier options
}

interface CartContextData {
    items: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (cartKey: string) => void;
    updateQty: (cartKey: string, qty: number) => void;
    clearCart: () => void;
    cartCount: number;
    totalCents: number;
    subtotalCents: number;
    coupon: CouponState | null;
    applyCoupon: (code: string, discountCents: number) => void;
    removeCoupon: () => void;
    // Revenue AI & Proactive Sales
    freeDeliveryThreshold: number;
    progressToFreeDelivery: number; // 0 to 100
    isFreeDeliveryEligible: boolean;
    getRecommendations: (allProducts: any[]) => any[];
}

const CartContext = createContext<CartContextData>({} as CartContextData);
const STORAGE_KEY = '@xAcai:cart_v2'; // v2 to reset old format

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [coupon, setCoupon] = useState<CouponState | null>(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.items) setItems(parsed.items);
                if (parsed.coupon) setCoupon(parsed.coupon);
            }
        } catch { }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, coupon }));
    }, [items, coupon, hydrated]);

    const addToCart = useCallback((newItem: CartItem) => {
        setItems(prev => {
            // Deduplicate by cartKey (same product + same modifier choices)
            const existing = prev.find(i => i.cartKey === newItem.cartKey);
            if (existing) {
                return prev.map(i => i.cartKey === newItem.cartKey ? { ...i, qty: i.qty + newItem.qty } : i);
            }
            return [...prev, newItem];
        });
    }, []);

    const removeFromCart = useCallback((cartKey: string) => {
        setItems(prev => prev.filter(i => i.cartKey !== cartKey));
    }, []);

    const updateQty = useCallback((cartKey: string, qty: number) => {
        if (qty <= 0) {
            setItems(prev => prev.filter(i => i.cartKey !== cartKey));
        } else {
            setItems(prev => prev.map(i => i.cartKey === cartKey ? { ...i, qty } : i));
        }
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    const cartCount = items.reduce((acc, item) => acc + item.qty, 0);
    const subtotalCents = items.reduce((acc, item) => acc + item.price_cents * item.qty, 0);
    const totalCents = Math.max(0, subtotalCents - (coupon?.discountCents || 0));

    // Revenue AI: Proactive Thresholds (Hardcoded for MVP, could be dynamic per tenant)
    const freeDeliveryThreshold = 5000; // R$ 50,00
    const isFreeDeliveryEligible = subtotalCents >= freeDeliveryThreshold;
    const progressToFreeDelivery = Math.min(100, (subtotalCents / freeDeliveryThreshold) * 100);

    const applyCoupon = useCallback((code: string, discountCents: number) => {
        setCoupon({ code, discountCents });
    }, []);

    const removeCoupon = useCallback(() => {
        setCoupon(null);
    }, []);

    /**
     * getRecommendations — Revenue AI Algorithm
     * Recommends items based on what's NOT in the cart but belongs to complementary categories.
     */
    const getRecommendations = useCallback((allProducts: any[]) => {
        if (items.length === 0) return [];

        const inCartIds = items.map(i => i.menuItemId);
        const categoriesInCart = items.map(i => i.name.toLowerCase()); // Simple heuristic

        // Priority: Beverages and Sides if only Açaí is in cart
        return allProducts
            .filter(p => !inCartIds.includes(p.id) && p.available !== 0 && p.out_of_stock !== 1)
            .sort((a, b) => {
                // Heuristic: boost popular tags or specific categories
                if (a.tags?.includes('popular')) return -1;
                if (a.category === 'Bebidas' || a.category === 'Sucos') return -1;
                return 0;
            })
            .slice(0, 3);
    }, [items]);

    return (
        <CartContext.Provider value={{
            items, addToCart, removeFromCart, updateQty, clearCart,
            cartCount, subtotalCents, totalCents, coupon, applyCoupon, removeCoupon,
            freeDeliveryThreshold, progressToFreeDelivery, isFreeDeliveryEligible, getRecommendations
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);

// Helper: build a unique cartKey from menuItemId + selected options
export function buildCartKey(menuItemId: string, selectedOptions: SelectedOption[]): string {
    const optKey = selectedOptions.map(o => o.optionId).sort().join(',');
    return `${menuItemId}|${optKey}`;
}
