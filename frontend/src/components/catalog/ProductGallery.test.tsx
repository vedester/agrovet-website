import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ProductGallery from "./ProductGallery";

// next/image needs the Next.js runtime; a plain <img> is enough to test the gallery logic.
vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
  };
});

const photos = [
  { id: 1, src: "/media/a.webp", alt: "Front of bag" },
  { id: 2, src: "/media/b.webp", alt: "Back of bag" },
];

describe("ProductGallery", () => {
  it("shows the first photo and switches when a thumbnail is chosen", async () => {
    const user = userEvent.setup();
    render(<ProductGallery photos={photos} productName="DAP Fertilizer" />);

    expect(screen.getByRole("img", { name: "Front of bag" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show photo 1 of 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Show photo 2 of 2" }));

    expect(screen.getByRole("img", { name: "Back of bag" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show photo 2 of 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("hides the thumbnails when there is a single photo", () => {
    render(<ProductGallery photos={[photos[0]]} productName="DAP Fertilizer" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows a placeholder, not a broken image, when there are no photos", () => {
    render(<ProductGallery photos={[]} productName="DAP Fertilizer" />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
