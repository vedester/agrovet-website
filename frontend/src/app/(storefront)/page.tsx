// Directory: frontend/src/app/page.tsx

import { Suspense } from "react";

import CategorySection from "@/components/home/CategorySection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import HomeHero from "@/components/home/HomeHero";

export default function Home() {
  return (
    <>
      <Suspense
        fallback={<div className="min-h-[600px] bg-cream" aria-label="Loading homepage hero" />}
      >
        <HomeHero />
      </Suspense>

      <Suspense
        fallback={
          <div className="min-h-[400px] bg-white" aria-label="Loading product categories" />
        }
      >
        <CategorySection />
      </Suspense>

      <Suspense
        fallback={<div className="min-h-[500px] bg-cream" aria-label="Loading featured products" />}
      >
        <FeaturedProducts />
      </Suspense>
    </>
  );
}
