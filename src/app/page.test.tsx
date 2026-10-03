import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { AppFrame } from "./app-frame";
import HomePage from "./page";

function renderShell() {
  return render(
    <AppFrame>
      <HomePage />
    </AppFrame>,
  );
}

describe("HomePage", () => {
  it("identifies the workspace and offers Generate without claiming playback", () => {
    renderShell();

    expect(screen.getByRole("heading", { level: 1, name: "Nightdrive workspace" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Generate" })).toBeVisible();
    expect(screen.getByText(/no playback is claimed here/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
  });

  it("has no detectable baseline accessibility violations", async () => {
    const { container } = renderShell();
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toHaveLength(0);
  });
});
