// Directory: frontend/src/app/admin/(protected)/products/[productId]/edit/page.tsx

import { notFound } from "next/navigation";
import ProductForm from "@/features/admin/catalog/components/ProductForm";

export const instant = false;

type Props = {
  params: Promise<{ productId: string }>;
};

export default async function EditAdminProductPage({ params }: Props) {
  const { productId } = await params;

  if (!/^[1-9]\d*$/.test(productId) || !Number.isSafeInteger(Number(productId))) {
    notFound();
  }

  return <ProductForm productId={Number(productId)} />;
}
