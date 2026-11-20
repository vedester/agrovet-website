import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Breadcrumbs from "./Breadcrumbs";

describe("Breadcrumbs", () => {
  it("links the earlier steps and marks the last one as the current page", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          { label: "DAP Fertilizer" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/products");
    expect(screen.getByText("DAP Fertilizer")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "DAP Fertilizer" })).toBeNull();
  });
});
