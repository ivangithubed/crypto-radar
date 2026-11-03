import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { useDocumentTitle } from "../ui/index.js";

/** S-4 «Сторінку не знайдено» (UX §3 S-4, §5.2 `notFound.*`): фокус на h1. */
export function NotFoundPage() {
  useDocumentTitle("Сторінку не знайдено — Крипто-Радар");
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <>
      <h1
        ref={heading}
        tabIndex={-1}
        className="font-display text-xl font-semibold focus:outline-none md:text-2xl"
      >
        Сторінку не знайдено
      </h1>
      <p>Такої сторінки в Крипто-Радарі немає.</p>
      <p>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-sm bg-brand px-4 py-2.5 font-semibold text-on-brand no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Відкрити топ-50
        </Link>
      </p>
    </>
  );
}
