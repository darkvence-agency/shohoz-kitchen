"use client";

import { useAppSelector, useAppDispatch } from '@/redux';
import { useGetWishlistQuery, useToggleWishlistMutation } from '@/redux/api/userApi';
import { toggleWishlist as toggleLocalWishlist } from '@/redux/slices/wishlistSlice';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Single source of truth for the wishlist across the whole app.
 * - Logged-in users  → server wishlist (useGetWishlistQuery / toggle mutation)
 * - Guests           → local wishlist slice (localStorage-backed)
 * Use this everywhere (header count badge, product card, product detail) so the
 * count + "is in wishlist" state stay consistent.
 */
export function useWishlist() {
    const dispatch = useAppDispatch();
    const { isAuthenticated } = useAppSelector((s: any) => s.auth);
    const localItems = useAppSelector((s: any) => s.wishlist.items) as any[];

    const { data: serverWishlist } = useGetWishlistQuery({}, { skip: !isAuthenticated });
    const [toggleApi] = useToggleWishlistMutation();

    const serverItems: any[] = serverWishlist?.data || [];

    const ids: string[] = isAuthenticated
        ? serverItems.map((it) => String(it._id || it.id))
        : localItems.map((it) => String(it.id));

    const count = ids.length;
    const isInWishlist = (id: string | number) => ids.includes(String(id));

    const toggle = async (product: any) => {
        const id = String(product._id || product.id);
        if (isAuthenticated) {
            try {
                await toggleApi(id).unwrap();
            } catch (err) {
                console.error('Wishlist toggle failed:', err);
            }
        } else {
            dispatch(
                toggleLocalWishlist({
                    id,
                    name: product.name,
                    price: product.price,
                    mrp: product.originalPrice || product.mrp || product.price,
                    image: product.thumbnail || product.images?.[0] || product.image || '',
                    category: product.category?.name || product.categoryName || '',
                    rating: product.rating || 0,
                })
            );
        }
    };

    return { ids, count, isInWishlist, toggle, isAuthenticated };
}

export default useWishlist;
