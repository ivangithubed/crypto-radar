import { useId } from "react";
import { TermHintButton } from "../ui/index.js";
import { HINT_TEXTS, TERM_LABELS } from "./terms.js";

/**
 * Кнопка «?» з підказкою до терміна (TermHintButton модуля ui з текстами глосарію).
 * @param {{term: import('./terms.js').TermKey}} props
 * @returns {import('react').ReactElement}
 */
export function TermHint({ term }) {
  const id = useId();
  return <TermHintButton term={TERM_LABELS[term]} hintText={HINT_TEXTS[term]} id={id} />;
}
