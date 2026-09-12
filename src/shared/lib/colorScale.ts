/** Шкали кольору для відсоткових показників (completion, on-time %). */

/** Колір тексту. */
export const percentTextColor = (percent: number): string =>
  percent >= 90 ? 'text-ok' : percent >= 60 ? 'text-amber' : 'text-bad';

/** Клас фону клітинки. П'ять сходинок, як у прототипі. */
export const percentBackground = (percent: number): string => {
  if (percent >= 90) return 'bg-scale-90';
  if (percent >= 75) return 'bg-scale-75';
  if (percent >= 60) return 'bg-scale-60';
  if (percent >= 40) return 'bg-scale-40';
  return 'bg-scale-0';
};
