
// Directory: frontend/src/features/admin/shell/navigation.ts

export type AdminNavigationIcon =
  | "dashboard"
  | "orders"
  | "products"
  | "categories"
  | "inventory"
  | "enquiries"
  | "settings";

export type AdminNavigationItem = {
  label: string;
  href: string;
  icon: AdminNavigationIcon;
  exact?: boolean;
};

export type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

export const ADMIN_NAVIGATION: AdminNavigationGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: "dashboard",
        exact: true,
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        label: "Orders",
        href: "/admin/orders",
        icon: "orders",
      },
    ],
  },
  {
    label: "Catalogue",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        icon: "products",
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: "categories",
      },
      {
        label: "Inventory",
        href: "/admin/inventory",
        icon: "inventory",
      },
    ],
  },
  {
    label: "Customer relations",
    items: [
      {
        label: "Enquiries",
        href: "/admin/enquiries",
        icon: "enquiries",
      },
    ],
  },
  {
    label: "Storefront",
    items: [
      {
        label: "Website settings",
        href: "/admin/settings",
        icon: "settings",
      },
    ],
  },
];
