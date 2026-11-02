import { Link } from "react-router";
import { Skeleton } from "../../ui/index.js";
import { TEXTS } from "./model.js";

const BOX = "grid justify-items-start gap-2 rounded-md border p-6";

/** Empty (UX S-3): нічого не обрано або сховище недоступне для читання. */
export function EmptyBlock({ readFailed }) {
  return (
    <section className={`${BOX} border-line bg-surface-raised`}>
      <h2 className="m-0 font-sans text-lg leading-6 font-semibold">{TEXTS.emptyTitle}</h2>
      <p className="m-0">{readFailed ? TEXTS.readFail : TEXTS.emptyText}</p>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center rounded-sm bg-brand px-4 py-2.5 font-semibold text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {TEXTS.emptyCta}
      </Link>
    </section>
  );
}

/** Порада Safari (ADR 0006) із кнопкою закриття. */
export function SafariHintBlock({ onDismiss }) {
  return (
    <section
      aria-labelledby="safari-hint-title"
      className={`${BOX} border-transparent bg-brand-soft`}
    >
      <div className="flex w-full items-start gap-2">
        <h2 id="safari-hint-title" className="m-0 font-sans text-lg leading-6 font-semibold">
          {TEXTS.safariTitle}
        </h2>
        <button
          type="button"
          aria-label={TEXTS.safariClose}
          onClick={onDismiss}
          className="ml-auto h-8 w-8 flex-none cursor-pointer rounded-full text-xl text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <p className="m-0">{TEXTS.safariText}</p>
    </section>
  );
}

/** Loading: скелетон стільки карток, скільки обраних (до 6). */
export function LoadingCards({ count }) {
  return (
    <div aria-hidden="true" className="grid gap-2">
      {Array.from({ length: Math.min(count, 6) }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  );
}
