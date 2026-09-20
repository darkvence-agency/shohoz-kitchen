// Who may open which admin page. The server enforces the same rules on its API
// (authorizeRoles on each route); this only keeps the menu and the pages in step.
//
//   superadmin — everything.
//   admin      — everything except money and dealers (Accounts, Expenses, Investors,
//                Courier payouts, Suppliers, Purchases) and Roles; cannot delete users.
//   editor     — the order desk and the catalogue: confirm / update orders, print
//                labels and invoices, add and update products, fraud check.

export type StaffRole = 'superadmin' | 'admin' | 'editor';

export const ADMIN_ROOT = '/dashboard/admin';

export const ROLE_LABEL: Record<string, string> = {
    superadmin: 'Super admin',
    admin: 'Admin',
    editor: 'Editor',
    user: 'Customer',
};

/** One line per role, for staff screens. */
export const ROLE_HINT: Record<StaffRole, string> = {
    superadmin: 'Everything, including money, dealers, roles and deleting users.',
    admin: 'Runs the shop. No money or dealer pages, no roles, cannot delete users.',
    editor: 'Order desk and catalogue: confirms orders, prints labels and invoices, adds and updates products.',
};

/** What each role can do, as a short list for the Roles page. */
export const ROLE_ACCESS: Record<StaffRole, string[]> = {
    superadmin: [
        'Everything in the admin panel',
        'Money: Accounts overview, Expenses, Investors, Courier payouts',
        'Dealers: Suppliers and Purchases',
        'Staff roles, and deleting users',
    ],
    admin: [
        'Dashboard, Reports, Orders, Products, Customers, Inventory, Settings and the rest',
        'No money pages (Accounts, Expenses, Investors, Courier payouts)',
        'No dealer pages (Suppliers, Purchases), no Roles',
        'Can block users but cannot delete them',
    ],
    editor: [
        'Orders: open, confirm and update status, add notes, print labels and invoices',
        'Products: add and update (cannot delete)',
        'Fraud check',
        'Nothing else — no dashboard money, customers or settings',
    ],
};

/** Pages only the super admin opens (money and dealers, roles). */
const SUPERADMIN_ONLY = ['/accounts', '/expenses', '/investors', '/courier-payouts', '/suppliers', '/purchases', '/roles'];

/** Everything an editor may open (and nothing else). */
const EDITOR_PAGES = ['/orders', '/products', '/fraud-check', '/profile', '/notifications'];
/** …except these, inside the editor pages: creating orders, bulk moderation. */
const EDITOR_BLOCKED = ['/orders/new', '/products/moderation'];

/** Works in the admin panel (as opposed to a shopper). */
export const isStaffRole = (role?: string): boolean => role === 'superadmin' || role === 'admin' || role === 'editor';

/** Where each role lands in the admin panel. */
export const homeFor = (role?: string): string => (role === 'editor' ? `${ADMIN_ROOT}/orders` : ADMIN_ROOT);

const under = (path: string, prefixes: string[]) =>
    prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** May this role open this admin path? (path = full pathname, e.g. /dashboard/admin/orders/123) */
export function canOpen(role: string | undefined, pathname: string): boolean {
    if (role === 'superadmin') return true;
    if (!pathname.startsWith(ADMIN_ROOT)) return true;
    const rel = pathname.slice(ADMIN_ROOT.length) || '/';
    if (role === 'admin') return !under(rel, SUPERADMIN_ONLY);
    if (role === 'editor') return under(rel, EDITOR_PAGES) && !under(rel, EDITOR_BLOCKED);
    return false;
}
