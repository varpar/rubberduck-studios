/* Numbered "how we work" steps. A translucent panel per step keeps them
 * distinct without reading as the old identical cards. */
export function ProcessSteps({
  steps,
}: {
  steps: { n: string; title: string; body: string }[];
}) {
  return (
    <ol className="grid gap-6 sm:grid-cols-2">
      {steps.map((s) => (
        <li
          key={s.n}
          className="rounded-2xl bg-white/55 p-6 ring-1 ring-black/10 shadow-[0_14px_44px_-26px_rgba(6,38,63,0.5)]"
        >
          <span className="font-display text-3xl text-[#06263f]">
            {s.n}
          </span>
          <h3 className="font-display mt-3 text-2xl tracking-tight text-[#06263f]">
            {s.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#06263f]/75">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}
