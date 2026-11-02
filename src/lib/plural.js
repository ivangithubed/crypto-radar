// Узгодження числівника зі словом «монета» (UX §5.2: search.found, nav.favorites, fav.kept).

const FORMS = {
  acc: { one: "монету", few: "монети", many: "монет" },
  nom: { one: "монета", few: "монети", many: "монет" },
};

/**
 * Число з узгодженим словом «монета»: acc — «1 монету», «2 монети», «5 монет»; nom — «1 монета», «2 монети», «5 монет».
 * @param {number} n
 * @param {'acc' | 'nom'} form
 * @returns {string}
 */
export function pluralCoins(n, form) {
  const lastTwo = n % 100;
  const last = n % 10;
  const forms = FORMS[form];
  let word = forms.many;
  if (lastTwo < 11 || lastTwo > 14) {
    if (last === 1) word = forms.one;
    else if (last >= 2 && last <= 4) word = forms.few;
  }
  return `${n} ${word}`;
}
