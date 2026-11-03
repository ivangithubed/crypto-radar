// NFR-3: таблиця «тригер → кількість запитів» для ["top-coins"] і ["stablecoins"] (RT-4).
import { act, render } from "@testing-library/react";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { StrictMode, useEffect, useState } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";
import top50 from "../test/fixtures/markets-top50.json";
import { MarketDataProvider, useStablecoinIds, useTopCoins } from "./index.js";

const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });
const isStable = (u) => String(u).includes("stablecoins");

const ctl = { go: () => {}, showExtra: () => {}, retry: () => {} };
/** Журнал станів Probe: кожен рендер useTopCoins. */
const log = [];
function Probe() {
  const state = useTopCoins();
  log.push({
    status: state.status,
    kind: state.errorKind,
    coins: state.coins.length,
    retrying: state.retrying,
    failed: state.retryFailed,
  });
  useEffect(() => {
    ctl.retry = state.retry;
  }, [state.retry]);
  return null;
}
function Screen({ name }) {
  const { status } = useTopCoins();
  useStablecoinIds();
  return <p>{`${name}:${status}`}</p>;
}
function Controls() {
  const navigate = useNavigate();
  const [extra, setExtra] = useState(false);
  useEffect(() => {
    ctl.go = navigate;
    ctl.showExtra = () => setExtra(true);
  }, [navigate]);
  return extra ? <Screen name="extra" /> : null;
}

function app(strict = false, path = "/a") {
  const tree = (
    <MarketDataProvider>
      <MemoryRouter initialEntries={[path]}>
        <Controls />
        <Routes>
          <Route path="/a" element={<Screen name="a" />} />
          <Route path="/b" element={<Screen name="b" />} />
          <Route path="/c" element={null} />
          <Route path="/p" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </MarketDataProvider>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

/** Відповіді топ-50 за станом; стейблкоїни завжди 500 (найгірший випадок: помилка без даних). */
function stub(responses) {
  let n = 0;
  const mock = vi.fn(async (url) => (isStable(url) ? fail(500) : responses(++n)));
  vi.stubGlobal("fetch", mock);
  return {
    top: () => mock.mock.calls.filter(([u]) => !isStable(u)).length,
    stable: () => mock.mock.calls.filter(([u]) => isStable(u)).length,
  };
}

const wait = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));
const setFocus = (value) => act(async () => focusManager.setFocused(value));
const setOnline = (value) => act(async () => onlineManager.setOnline(value));

beforeEach(() => {
  log.length = 0;
  vi.useFakeTimers({ now: new Date("2026-11-02T22:12:00.000Z") });
  focusManager.setFocused(true);
  onlineManager.setOnline(true);
});

afterEach(() => {
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Стани: відповіді й кількість HTTP-викликів на одну спробу (503: 1 + 2 повтори). */
const states = {
  success: { responses: () => ok(top50), perAttempt: 1 },
  "429 без даних": { responses: () => fail(429), perAttempt: 1 },
  "429 з даними": { responses: (n) => (n === 1 ? ok(top50) : fail(429)), perAttempt: 1 },
  503: { responses: () => fail(503), perAttempt: 3 },
};

// Тригер → дія після стартового стану (t = 7 с) і кількість НОВИХ спроб топ-50.
const triggers = [
  ["монтування нового екрана", 0, async () => (await act(async () => ctl.showExtra()), wait(100))],
  ["перехід маршрутом", 0, async () => (await act(async () => ctl.go("/b")), wait(100))],
  [
    "фокус вкладки через 5 с",
    0,
    async () => {
      await setFocus(false);
      await wait(5000);
      await setFocus(true);
      await wait(100);
    },
  ],
  [
    "reconnect через 5 с",
    0,
    async () => {
      await setOnline(false);
      await wait(5000);
      await setOnline(true);
      await wait(100);
    },
  ],
  [
    "прихована вкладка 3 хв + reconnect",
    0,
    async () => {
      await setFocus(false);
      await wait(60000);
      await setOnline(false);
      await wait(60000);
      await setOnline(true);
      await wait(60000);
    },
  ],
  ["тик інтервалу (60 с)", 1, () => wait(60000)],
  [
    "фокус після 61 с у прихованій вкладці",
    1,
    async () => {
      await setFocus(false);
      await wait(61000);
      await setFocus(true);
      await wait(100);
    },
  ],
  [
    "reconnect у видимій вкладці через 61 с",
    1,
    async () => {
      await setOnline(false);
      await wait(61000);
      await setOnline(true);
      await wait(100);
    },
  ],
];

describe("NFR-3: тригер → запити топ-50 / стейблкоїнів", () => {
  const rows = Object.keys(states).flatMap((state) =>
    triggers.map(([name, attempts, act_]) => [state, name, attempts, act_]),
  );
  test.each(rows)("%s · %s", async (state, _name, attempts, action) => {
    const { responses, perAttempt } = states[state];
    const calls = stub(responses);
    app();
    await wait(7000);
    expect(calls.top()).toBe(perAttempt);
    expect(calls.stable()).toBe(1);
    await action();
    await wait(7000); // дочекатися ланцюга повторів 503
    expect(calls.top()).toBe(perAttempt * (1 + attempts));
    expect(calls.stable()).toBe(1);
  });
});

describe("NFR-2 / NFR-3: окремі сценарії", () => {
  it("429 без даних: reconnect через 5 с — 0, через ≥ 60 с від спроби у видимій вкладці — рівно 1", async () => {
    const calls = stub(() => fail(429));
    app();
    await wait(100);
    await setOnline(false);
    await wait(5000);
    await setOnline(true);
    await wait(100);
    expect(calls.top()).toBe(1);
    await wait(56000);
    await setOnline(false);
    await setOnline(true);
    await wait(100);
    expect(calls.top()).toBe(2);
    expect(calls.stable()).toBe(1);
  });

  it("успіх, прихована 61 с, повернення — рівно 1 додатковий запит", async () => {
    const calls = stub(() => ok(top50));
    app();
    await wait(100);
    await setFocus(false);
    await wait(61000);
    await setFocus(true);
    await wait(100);
    expect(calls.top()).toBe(2);
  });

  it("видима вкладка, 3 хв без дій: 3 тики інтервалу (разом зі стартом — 4)", async () => {
    const calls = stub(() => ok(top50));
    app();
    await wait(100);
    await wait(179000);
    expect(calls.top()).toBe(3);
    await wait(1900);
    expect(calls.top()).toBe(4);
    expect(calls.stable()).toBe(1);
  });

  it("429 без даних: тик інтервалу (повторна спроба топ-50) не повторює стейблкоїни", async () => {
    const calls = stub(() => fail(429));
    app();
    await wait(100);
    expect(calls.stable()).toBe(1);
    await wait(60100);
    expect(calls.top()).toBe(2);
    expect(calls.stable()).toBe(1);
  });

  it("старт у StrictMode: 1 топ-50 і 1 стейблкоїни", async () => {
    const calls = stub(() => ok(top50));
    app(true);
    await wait(500);
    expect(calls.top()).toBe(1);
    expect(calls.stable()).toBe(1);
  });
});

/** Відкладена відповідь: розв'язується вручну. */
function deferred() {
  let resolve = () => {};
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("RT-5 / RT-6 / TD-016 / TD-017: пакетний ремонт", () => {
  it("RT-5: офлайн у видимій → тик → сховали вкладку → онлайн — 0 нових запитів топ-50", async () => {
    let offline = false;
    const mock = vi.fn(async (url) => {
      if (offline) throw new TypeError("Failed to fetch");
      return isStable(url) ? fail(500) : ok(top50);
    });
    vi.stubGlobal("fetch", mock);
    const top = () => mock.mock.calls.filter(([u]) => !isStable(u)).length;
    app();
    await wait(100);
    expect(top()).toBe(1);
    offline = true;
    await setOnline(false);
    await wait(60000); // тик: офлайн-спроба йде (не призупиняється) і закінчується 1 + 2 повторами
    await wait(7000);
    expect(top()).toBe(4);
    await setFocus(false);
    offline = false;
    await setOnline(true);
    await wait(61000);
    expect(top()).toBe(4);
  });

  it("RT-5: офлайн → status error, errorKind net (без вічного loading), тик лишає net", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await setOnline(false);
    app(false, "/p");
    await wait(7000);
    expect(log.at(-1)).toMatchObject({ status: "error", kind: "net", coins: 0 });
    await wait(60000);
    await wait(7000);
    expect(log.at(-1)).toMatchObject({ status: "error", kind: "net" });
    expect(log.slice(1).some((entry) => entry.status === "loading")).toBe(false);
  });

  it("RT-5: ручний повтор в офлайні → retryFailed, retrying повертається в false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await setOnline(false);
    app(false, "/p");
    await wait(7000);
    act(() => ctl.retry());
    expect(log.at(-1).retrying).toBe(true);
    await wait(7000);
    expect(log.at(-1)).toMatchObject({ retrying: false, failed: true, status: "error" });
  });

  it("RT-6: перехід між екранами під час запиту стейблкоїнів — рівно 1 запит", async () => {
    const pending = deferred();
    const mock = vi.fn(async (url) => (isStable(url) ? pending.promise : ok(top50)));
    vi.stubGlobal("fetch", mock);
    const stable = () => mock.mock.calls.filter(([u]) => isStable(u)).length;
    app();
    await wait(100);
    expect(stable()).toBe(1);
    await act(async () => ctl.go("/c")); // усі спостерігачі стейблкоїнів розмонтовано
    await wait(100);
    await act(async () => ctl.go("/b"));
    await wait(100);
    expect(stable()).toBe(1);
    pending.resolve(ok([{ id: "tether" }]));
    await wait(100);
    expect(stable()).toBe(1);
  });

  it("RT-6: StrictMode з enabled: true від першого монтування — 1 запит стейблкоїнів", async () => {
    const calls = stub(() => ok(top50));
    app(true, "/c");
    await wait(7000);
    expect(calls.stable()).toBe(0);
    await act(async () => ctl.go("/a")); // Screen монтується, коли відповідь топ-50 уже є
    await wait(500);
    expect(calls.stable()).toBe(1);
    expect(calls.top()).toBe(1);
  });

  it("TD-017: ручний повтор під час фонового 503-ланцюга — не більше 3 запитів, другого ланцюга немає", async () => {
    const calls = stub(() => fail(503));
    app(false, "/p");
    await wait(500); // перша спроба вже невдала, чекаємо 2 с до повтору
    act(() => ctl.retry());
    await wait(100);
    expect(log.at(-1).retrying).toBe(true);
    await wait(8000);
    expect(calls.top()).toBe(3);
    expect(log.at(-1)).toMatchObject({ retrying: false, failed: true, status: "error" });
    await wait(5000);
    expect(calls.top()).toBe(3);
  });

  it("TD-017: ручний повтор під час фонового 503-ланцюга при наявних даних — без скасування й другого ланцюга", async () => {
    const calls = stub((n) => (n === 1 ? ok(top50) : fail(503)));
    app(false, "/p");
    await wait(100);
    await wait(60500); // тик: перша невдала спроба, чекаємо 2 с до повтору
    act(() => ctl.retry());
    await wait(8000);
    expect(calls.top()).toBe(4);
    expect(log.at(-1)).toMatchObject({ retrying: false, failed: true });
    await wait(5000);
    expect(calls.top()).toBe(4);
  });

  it("TD-016: помилка без даних + тик 60 с — status весь час error, coins порожні, потім fresh", async () => {
    const second = deferred();
    const calls = stub((n) => (n === 1 ? fail(429) : second.promise));
    app(false, "/p");
    await wait(7000);
    expect(log.at(-1)).toMatchObject({ status: "error", kind: "src" });
    const from = log.length;
    await wait(60000); // тик: друга спроба зависла у відкладеній відповіді
    await wait(5000);
    expect(calls.top()).toBe(2);
    expect(
      log.slice(from).every((e) => e.status === "error" && e.kind === "src" && e.coins === 0),
    ).toBe(true);
    expect(log.at(-1).retrying).toBe(false);
    second.resolve(ok(top50));
    await wait(100);
    expect(log.at(-1)).toMatchObject({ status: "fresh", kind: null });
  });

  it("TD-016: після нової помилки kind оновлюється (src → net)", async () => {
    const second = deferred();
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (isStable(url)) return fail(500);
        n += 1;
        if (n === 1) return fail(429);
        await second.promise;
        throw new TypeError("Failed to fetch");
      }),
    );
    app(false, "/p");
    await wait(7000);
    expect(log.at(-1).kind).toBe("src");
    await wait(60000);
    expect(log.at(-1)).toMatchObject({ status: "error", kind: "src" });
    second.resolve();
    await wait(7000);
    expect(log.at(-1)).toMatchObject({ status: "error", kind: "net" });
  });
});
