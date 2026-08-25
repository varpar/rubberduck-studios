/* "Why us" — a word + a note per row, divided rules. Distinct from the process
 * grid and the service blocks, so the page keeps varying. */
export function PrincipleList({
  items,
}: {
  items: { word: string; note: string }[];
}) {
  return (
    <ul className="mx-auto max-w-xl divide-y divide-black/10">
      {items.map((p) => (
        <li
          key={p.word}
          className="flex flex-col gap-1 py-5 first:pt-0"
        >
          <span className="font-display text-2xl tracking-tight text-[#06263f]">
            {p.word}
          </span>
          <span className="text-base leading-relaxed text-[#06263f]/75">{p.note}</span>
        </li>
      ))}
    </ul>
  );
}
