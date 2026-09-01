/**
 * Light-weight route feedback for a direct case-study visit. The real page is
 * static, but this keeps a prefetch miss from looking like an ignored tap.
 */
export default function CaseStudyLoading() {
  return (
    <main
      id="main-content"
      aria-busy="true"
      aria-label="Opening case study"
      className="rd-story min-h-screen"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-32 sm:px-8 lg:grid-cols-2 lg:px-10">
        <div className="space-y-5">
          <div className="h-3 w-40 animate-pulse rounded-full bg-white/18 motion-reduce:animate-none" />
          <div className="h-20 max-w-md animate-pulse rounded-2xl bg-white/12 motion-reduce:animate-none" />
          <div className="h-5 max-w-xl animate-pulse rounded-full bg-white/12 motion-reduce:animate-none" />
          <div className="h-5 max-w-lg animate-pulse rounded-full bg-white/12 motion-reduce:animate-none" />
        </div>
        <div className="aspect-[16/10] animate-pulse rounded-[1.75rem] bg-white/12 ring-1 ring-white/16 motion-reduce:animate-none" />
      </div>
    </main>
  );
}
