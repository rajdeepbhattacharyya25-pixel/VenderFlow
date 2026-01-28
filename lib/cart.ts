/**
 * Cart Seller Lock Logic
 * 
 * Prevents customers from mixing items from different sellers in their cart.
 * When a customer adds an item, the cart becomes "locked" to that seller.
 */

const CART_SELLER_KEY = 'cart_seller_id';
const CART_ITEMS_KEY = 'cart_items';

export interface CartItem {
    productId: string;
    sellerId: string;
    name: string;
    price: number;
    size: string;
    quantity: number;
    image?: string;
}

/**
 * Get the seller ID the cart is currently locked to
 */
export function getCartSeller(): string | null {
    return localStorage.getItem(CART_SELLER_KEY);
}

/**
 * Lock the cart to a specific seller
 */
export function setCartSeller(sellerId: string): void {
    localStorage.setItem(CART_SELLER_KEY, sellerId);
}

/**
 * Clear the cart seller lock
 */
export function clearCartSeller(): void {
    localStorage.removeItem(CART_SELLER_KEY);
}

/**
 * Check if the cart is locked to a different seller
 * 
 * @param sellerId - The seller ID to check against
 * @returns true if cart is locked to a DIFFERENT seller
 */
export function isCartLockedToDifferentSeller(sellerId: string): boolean {
    const currentCartSeller = getCartSeller();
    return currentCartSeller !== null && currentCartSeller !== sellerId;
}

/**
 * Check if adding an item from a seller is allowed
 * 
 * @param sellerId - The seller ID of the item to add
 * @returns Object with allowed status and current seller if blocked
 */
export function canAddToCart(sellerId: string): { allowed: boolean; currentSellerId?: string } {
    const currentCartSeller = getCartSeller();

    // Cart is empty or locked to the same seller
    if (!currentCartSeller || currentCartSeller === sellerId) {
        return { allowed: true };
    }

    // Cart is locked to a different seller
    return { allowed: false, currentSellerId: currentCartSeller };
}

/**
 * Get cart items from localStorage
 */
export function getCartItems(): CartItem[] {
    const items = localStorage.getItem(CART_ITEMS_KEY);
    return items ? JSON.parse(items) : [];
}

/**
 * Save cart items to localStorage
 */
export function saveCartItems(items: CartItem[]): void {
    localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(items));

    // Update cart seller lock based on items
    if (items.length > 0) {
        setCartSeller(items[0].sellerId);
    } else {
        clearCartSeller();
    }

    // Dispatch event for UI updates and sync
    window.dispatchEvent(new Event('cart-updated'));
}

/**
 * Add item to cart with seller lock check
 * 
 * @returns true if added successfully, false if blocked by seller lock
 */
export function addItemToCart(item: CartItem): boolean {
    const { allowed } = canAddToCart(item.sellerId);

    if (!allowed) {
        return false;
    }

    const items = getCartItems();
    const existingIndex = items.findIndex(
        i => i.productId === item.productId && i.size === item.size
    );

    if (existingIndex >= 0) {
        items[existingIndex].quantity += item.quantity;
    } else {
        items.push(item);
    }

    saveCartItems(items);
    return true;
}

/**
 * Remove item from cart
 */
export function removeItemFromCart(productId: string, size: string): void {
    const items = getCartItems();
    const filteredItems = items.filter(
        i => !(i.productId === productId && i.size === size)
    );
    saveCartItems(filteredItems);
}

/**
 * Clear the entire cart
 */
export function clearCart(): void {
    localStorage.removeItem(CART_ITEMS_KEY);
    clearCartSeller();
}

/**
 * Get total items count in cart
 */
export function getCartItemCount(): number {
    const items = getCartItems();
    return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get cart total price
 */
export function getCartTotal(): number {
    const items = getCartItems();
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}
