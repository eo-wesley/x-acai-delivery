'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { COUNTER_PRICE_VERSION, migrateCounterCart, repriceCounterCartItem } from '../lib/counter-prices';
import { isMenuItemAvailable, publicCategoryKey } from '../lib/menu-presentation';
import type { CatalogMenuItem } from '../lib/load-menu';

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
    cartKey: string;           // unique key = menuItemId + selected options + notes
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
    priceUpdateNotice: boolean;
    // Revenue AI & Proactive Sales
    freeDeliveryThreshold: number;
    progressToFreeDelivery: number; // 0 to 100
    isFreeDeliveryEligible: boolean;
    getRecommendations: (allProducts: CatalogMenuItem[]) => CatalogMenuItem[];
}

const CartContext = createContext<CartContextData>({} as CartContextData);
const STORAGE_KEY = '@xAcai:cart_v2'; // Keep existing items; version the prices inside the saved cart.

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [coupon, setCoupon] = useState<CouponState | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [priceUpdateNotice, setPriceUpdateNotice] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.items)) {
                    const migrated = migrateCounterCart<CartItem, CouponState>(parsed);
                    setItems(migrated.items);
                    setCoupon(migrated.coupon);
                    setPriceUpdateNotice(migrated.priceUpdated);
                }
            }
        } catch { }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, coupon, priceVersion: COUNTER_PRICE_VERSION }));
        } catch {
            // The in-memory basket remains usable when storage is unavailable.
        }
    }, [items, coupon, hydrated]);

    const addToCart = useCallback((item: CartItem) => {
        const newItem = repriceCounterCartItem(item);
        setItems(prev => {
            // Deduplicate by cartKey (same product, modifier choices and notes)
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
    const getRecommendations = useCallback((allProducts: CatalogMenuItem[]) => {
        if (items.length === 0) return [];

        const inCartIds = items.map(i => i.menuItemId);

        // Priority: Beverages and Sides if only Açaí is in cart
        return allProducts
            .filter(p => !inCartIds.includes(p.id) && isMenuItemAvailable(p) && publicCategoryKey(p.category))
            .sort((a, b) => Number(publicCategoryKey(b.category) === 'vai uma bebida?')
                - Number(publicCategoryKey(a.category) === 'vai uma bebida?'))
            .slice(0, 3);
    }, [items]);

    return (
        <CartContext.Provider value={{
            items, addToCart, removeFromCart, updateQty, clearCart,
            cartCount, subtotalCents, totalCents, coupon, applyCoupon, removeCoupon, priceUpdateNotice,
            freeDeliveryThreshold, progressToFreeDelivery, isFreeDeliveryEligible, getRecommendations
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);

// An empty note keeps the existing key format for saved carts and two-argument callers.
export function buildCartKey(menuItemId: string, selectedOptions: SelectedOption[], notes = ''): string {
    const optKey = selectedOptions.map(o => o.optionId).sort().join(',');
    const noteKey = notes.trim();
    return `${menuItemId}|${optKey}${noteKey ? `|notes:${JSON.stringify(noteKey)}` : ''}`;
}
