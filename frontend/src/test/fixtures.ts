// Sample backend responses for tests. The shapes mirror the Django API exactly.

export const productCardWire = {
  id: 7,
  name: "DAP Fertilizer",
  slug: "dap-fertilizer-50-kg-bag",
  sku: "FERT-DAP-50",
  brand: "",
  pack_size: "50 kg bag",
  price: "4500.00",
  is_in_stock: false,
  requires_advice: false,
  is_featured: false,
  category: { name: "Fertilizers", slug: "fertilizers" },
  cover_image: { id: 1, image: "http://127.0.0.1:8000/media/products/7/a.webp", alt_text: "" },
};

export const productDetailWire = {
  ...productCardWire,
  category: {
    name: "Fertilizers",
    slug: "fertilizers",
    parent: { name: "Farm Inputs", slug: "farm-inputs" },
  },
  description: "Phosphate fertilizer for planting.",
  images: [
    { id: 2, image: "http://127.0.0.1:8000/media/products/7/b.webp", alt_text: "Back of bag" },
    {
      id: 3,
      image: "http://127.0.0.1:8000/static/admin/logo.png",
      alt_text: "Not a product photo",
    },
  ],
};

export const categoryTreeWire = [
  {
    id: 1,
    name: "Animal Feeds",
    slug: "animal-feeds",
    description: "",
    image: null,
    product_count: 2,
    children: [
      {
        id: 2,
        name: "Dairy Meal",
        slug: "dairy-meal",
        description: "",
        image: "http://127.0.0.1:8000/media/categories/c.webp",
        product_count: 1,
        children: [],
      },
    ],
  },
];

export const siteSettingsWire = {
  business_name: "Mwangaza Agrovet",
  tagline: "Farm inputs you can trust",
  about_text: "",
  phone: "0712 345 678",
  whatsapp_number: "254712345678",
  whatsapp_url: "https://wa.me/254712345678",
  whatsapp_greeting: "Hello, I would like to order:",
  email: "",
  address: "Main Street",
  google_maps_url: "",
  opening_hours: [
    { day: "mon", closed: false, opens: "08:00", closes: "18:00" },
    { day: "sun", closed: true },
  ],
  hours_note: "",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: "",
  order_note: "We confirm availability and prices on WhatsApp.",
  seo_title: "",
  seo_description: "",
};
