// Directory: frontend/src/app/admin/(protected)/categories/[categoryId]/edit/page.tsx

import { notFound } from "next/navigation";

import CategoryForm from "@/features/admin/catalog/components/CategoryForm";

export const instant = false;

type Props = {
  params: Promise<{ categoryId: string }>;
};

export default async function EditAdminCategoryPage({ params }: Props) {
  const { categoryId } = await params;

  if (!/^[1-9]\d*$/.test(categoryId) || !Number.isSafeInteger(Number(categoryId))) {
    notFound();
  }

  return <CategoryForm categoryId={Number(categoryId)} />;
}
