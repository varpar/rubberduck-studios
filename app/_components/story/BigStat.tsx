/* A single oversized metric — huge Anton number + a small label. Used as the
 * visual side of a Split, or grouped into a stat band. */
export function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-7xl leading-none tracking-tight text-[#06263f] sm:text-8xl">
        {value}
      </div>
      <div className="mx-auto mt-3 max-w-[16rem] text-sm font-medium tracking-wide text-[#06263f]/70">
        {label}
      </div>
    </div>
  );
}
