// // Directory: frontend/src/app/layout.tsx

// import type { Metadata } from "next";
// import { Suspense } from "react";
// import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

// import SiteFooter from "@/components/layout/SiteFooter";
// import SiteHeader from "@/components/layout/SiteHeader";

// import "./globals.css";

// const display = Fraunces({
//   variable: "--font-display-face",
//   subsets: ["latin"],
//   display: "swap",
// });

// const sans = Plus_Jakarta_Sans({
//   variable: "--font-sans-face",
//   subsets: ["latin"],
//   display: "swap",
// });

// export const metadata: Metadata = {
//   title: { default: "Agrovet", template: "%s | Agrovet" },
//   description: "Farm inputs, animal health and advice, ordered easily on WhatsApp.",
// };

// export default function RootLayout({ children }: LayoutProps<"/">) {
//   return (
//     <html lang="en" className={`${display.variable} ${sans.variable}`}>
//       <body className="flex min-h-dvh flex-col">
//         <Suspense
//           fallback={
//             <header
//               aria-label="Loading site header"
//               className="h-20 border-b border-line bg-cream"
//             />
//           }
//         >
//           <SiteHeader />
//         </Suspense>

//         <main className="flex-1">{children}</main>

//         <Suspense
//           fallback={<footer aria-label="Loading site footer" className="min-h-64 bg-brand-900" />}
//         >
//           <SiteFooter />
//         </Suspense>
//       </body>
//     </html>
//   );
// }


// Directory: frontend/src/app/layout.tsx

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const display = Fraunces({
  variable: "--font-display-face",
  subsets: ["latin"],
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-face",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Agrovet",
    template: "%s | Agrovet",
  },
  description: "Farm inputs, animal health and advice, ordered easily on WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

