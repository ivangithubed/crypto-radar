import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HINT_TEXTS, TERM_KEYS, TERM_LABELS, TermHint } from "./index.js";

describe("TermHint", () => {
  it.each(TERM_KEYS)("ключ %s: кнопка має ім'я «Що означає «{термін}»?»", (key) => {
    render(<TermHint term={key} />);
    expect(
      screen.getByRole("button", { name: `Що означає «${TERM_LABELS[key]}»?` }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it.each(TERM_KEYS)("ключ %s: клік відкриває підказку, другий клік закриває", (key) => {
    render(<TermHint term={key} />);
    const button = screen.getByRole("button", { name: `Що означає «${TERM_LABELS[key]}»?` });

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("region", { name: TERM_LABELS[key] });
    expect(panel).toHaveTextContent(HINT_TEXTS[key]);

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: TERM_LABELS[key] })).toBeNull();
  });

  it("тексти підказок дослівно відповідають UX §5.1", () => {
    expect(HINT_TEXTS.marketCap).toBe(
      "Скільки коштують усі монети цього виду разом: ціна однієї монети, помножена на кількість монет в обігу. Чим більша капіталізація, тим вище монета в рейтингу.",
    );
    expect(HINT_TEXTS.stablecoin).toBe(
      "Монета, ціна якої прив'язана до звичайної валюти, найчастіше до долара США. Тому її ціна майже не змінюється — близько $1.",
    );
  });
});
