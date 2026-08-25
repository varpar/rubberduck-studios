/* Founder intro. Square photo (or a monogram fallback until a photo is added
 * at public/…), name, role, bio, links. Fixed dimensions → no layout shift. */
export function FounderCard({
  name,
  role,
  bio,
  photo,
  links,
}: {
  name: string;
  role: string;
  bio: string;
  photo?: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-8 text-center">
      <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-white/55 ring-1 ring-black/10 shadow-[0_14px_44px_-26px_rgba(6,38,63,0.5)]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={name}
            width={112}
            height={112}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-display text-4xl text-[#06263f]">
            {name.slice(0, 1)}
          </span>
        )}
      </div>
      <div>
        <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#06263f]">
          Meet {name}
        </span>
        <h2 className="font-display mt-1 text-3xl tracking-tight text-[#06263f]">{name}</h2>
        <p className="text-sm text-[#06263f]/75">{role}</p>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[#06263f]/75">{bio}</p>
        <div className="mt-4 flex justify-center gap-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-[#06263f] underline decoration-[#06263f] decoration-2 underline-offset-4 hover:opacity-80"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
