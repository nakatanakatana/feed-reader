import { render } from "solid-js/web";
import { describe, expect, it, vi, afterEach } from "vitest";
import { page } from "vitest/browser";
import { DateFilterSelector } from "./DateFilterSelector";

describe("DateFilterSelector", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("renders all preset options", async () => {
    const onSelect = vi.fn();
    dispose = render(() => <DateFilterSelector value="all" onSelect={onSelect} />, document.body);

    await expect.element(page.getByText("Date:")).toBeInTheDocument();
    const select = page.getByRole("combobox");
    await expect.element(select).toBeInTheDocument();
    
    // Check options
    await expect.element(page.getByText("All Time")).toBeInTheDocument();
    await expect.element(page.getByText("Past 24 Hours")).toBeInTheDocument();
    await expect.element(page.getByText("Past 7 Days")).toBeInTheDocument();
    await expect.element(page.getByText("Past 30 Days")).toBeInTheDocument();
  });

  it("calls onSelect when an option is chosen", async () => {
    const onSelect = vi.fn();
    dispose = render(() => <DateFilterSelector value="all" onSelect={onSelect} />, document.body);

    const select = page.getByRole("combobox");
    await select.selectOptions("24h");

    expect(onSelect).toHaveBeenCalledWith("24h");
  });

  it("reflects the current value", async () => {
    const onSelect = vi.fn();
    dispose = render(() => <DateFilterSelector value="7d" onSelect={onSelect} />, document.body);

    const select = page.getByRole("combobox");
    // In vitest/browser, we can check the value of the element
    const selectEl = document.getElementById("date-filter-select") as HTMLSelectElement;
    expect(selectEl.value).toBe("7d");
  });
});
