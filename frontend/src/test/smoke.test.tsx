import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("renders React and supports jest-dom matchers", () => {
    render(<button type="button">Order on WhatsApp</button>);
    expect(screen.getByRole("button", { name: "Order on WhatsApp" })).toBeEnabled();
  });
});
