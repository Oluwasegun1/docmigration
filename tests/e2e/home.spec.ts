import { expect, test } from "@playwright/test";

test("homepage renders and links to destinations", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Naija Doctor Migration Hub" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /explore destinations and pathways/i })
    .click();
  await expect(page).toHaveURL(/\/destinations$/);
});
