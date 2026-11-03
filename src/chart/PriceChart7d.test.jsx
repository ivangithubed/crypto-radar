import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceChart7d } from "./index.js";

const series = (n, from, to) =>
  Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

describe("PriceChart7d", () => {
  it("168 точок: svg прихований від AT, 168 пар координат, альтернатива з 4 цінами", () => {
    const prices = series(168, 64540, 67250.1);
    const { container } = render(<PriceChart7d prices={prices} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox");
    const pairs = container.querySelector("polyline").getAttribute("points").split(" ");
    expect(pairs).toHaveLength(168);
    expect(screen.getByText(/Ціна за 7 днів: на початку/).textContent).toBe(
      "Ціна за 7 днів: на початку $64 540,00, наприкінці $67 250,10, мінімум $64 540,00, максимум $67 250,10.",
    );
  });

  it("131 точка і немонотонний ряд: мінімум і максимум із даних", () => {
    const prices = series(131, 100, 200);
    prices[40] = 50;
    prices[90] = 300;
    const { container } = render(<PriceChart7d prices={prices} />);
    expect(container.querySelector("polyline").getAttribute("points").split(" ")).toHaveLength(131);
    expect(screen.getByText(/мінімум \$50,00, максимум \$300,00/)).toBeInTheDocument();
  });

  it("рівні ціни: без NaN, лінія посередині", () => {
    const { container } = render(<PriceChart7d prices={[5, 5, 5, 5]} />);
    const points = container.querySelector("polyline").getAttribute("points");
    expect(points).not.toMatch(/NaN|Infinity/);
    expect(new Set(points.split(" ").map((p) => p.split(",")[1])).size).toBe(1);
  });

  it("менше 2 точок: нічого не рендериться", () => {
    expect(render(<PriceChart7d prices={[]} />).container).toBeEmptyDOMElement();
    expect(render(<PriceChart7d prices={[1]} />).container).toBeEmptyDOMElement();
  });

  it("з end: підписи першого й останнього дня поза svg; без end — немає", () => {
    const prices = series(10, 1, 2);
    const end = new Date(2026, 9, 27, 12, 0, 0);
    const fmt = new Intl.DateTimeFormat("uk", { day: "numeric", month: "short" });
    const first = fmt.format(new Date(2026, 9, 20, 12, 0, 0));
    const last = fmt.format(end);
    const { container, unmount } = render(<PriceChart7d prices={prices} end={end} />);
    expect(first).not.toBe(last);
    expect(screen.getByText(first)).toBeInTheDocument();
    expect(screen.getByText(last)).toBeInTheDocument();
    expect(container.querySelector("svg").textContent).not.toContain(last);
    unmount();
    const { container: bare } = render(<PriceChart7d prices={prices} />);
    expect(bare.querySelectorAll("span")).toHaveLength(0);
  });
});
