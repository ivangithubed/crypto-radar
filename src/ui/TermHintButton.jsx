import { useEffect, useRef, useSyncExternalStore } from "react";
import { getOpenHintId, setOpenHintId, subscribeHint } from "./hintStore.js";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Доступна підказка до терміна (UX §4, WCAG 1.4.13): `<button aria-expanded>` з ім'ям `Що означає «{term}»?`,
 * панель з `hintText` лише відкритою (закрита відсутня в DOM), Esc закриває з будь-якого місця й повертає фокус
 * на кнопку, одночасно відкрита одна підказка на сторінці.
 * @param {{term: string, hintText: string, id: string}} props term — видима назва терміна; id — id панелі
 * @returns {import('react').ReactElement}
 */
export function TermHintButton({ term, hintText, id }) {
  const open = useSyncExternalStore(
    subscribeHint,
    () => getOpenHintId() === id,
    () => false,
  );
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setOpenHintId(null);
      buttonRef.current?.focus();
    };
    const onPointerDown = (event) => {
      const target = event.target;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpenHintId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (getOpenHintId() === id) setOpenHintId(null);
    },
    [id],
  );

  const tone = open
    ? "border-brand bg-brand text-on-brand"
    : "border-line-strong bg-surface-raised text-brand";

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Що означає «${term}»?`}
        onClick={() => setOpenHintId(open ? null : id)}
        className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-full border font-sans text-sm font-semibold ${tone} ${FOCUS_RING}`}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={id}
          role="region"
          aria-label={term}
          className="absolute top-full left-0 z-10 mt-2 flex w-max max-w-80 items-start gap-2 rounded-md bg-surface-raised p-4 text-ink shadow-pop"
        >
          <div>
            <p className="font-sans font-semibold">{term}</p>
            <p className="mt-1 text-sm">{hintText}</p>
          </div>
          <button
            type="button"
            aria-label="Закрити підказку"
            onClick={() => {
              setOpenHintId(null);
              buttonRef.current?.focus();
            }}
            className={`inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted ${FOCUS_RING}`}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ) : null}
    </span>
  );
}
