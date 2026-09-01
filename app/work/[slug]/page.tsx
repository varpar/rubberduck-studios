import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd, getPageJsonLd } from "../../_components/seo/JsonLd";
import { createPageMetadata } from "../../_components/seo/metadata";
import { CaseStudyStory } from "../../_components/story/pages/CaseStudyStory";
import { getProjectBySlug, work } from "../../_data/work";

type CaseStudyPageProps = {
  params: Promise<{ slug: string }>;
};

/** These two studies are static, shareable routes—not client-only modals. */
export function generateStaticParams() {
  return work.projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) notFound();

  return createPageMetadata({
    path: `/work/${project.slug}`,
    title: `${project.title} case study`,
    description: project.caseStudy.intro,
    image: project.visual.src,
    imageAlt: project.visual.alt,
  });
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) notFound();

  const path = `/work/${project.slug}`;

  return (
    <>
      <JsonLd
        data={getPageJsonLd({
          path,
          name: `${project.title} case study — Rubberduck`,
          description: project.caseStudy.intro,
          image: project.visual.src,
          serviceKeys: ["productDevelopment"],
          breadcrumbs: [{ name: "Work", path: "/work" }],
        })}
      />
      <CaseStudyStory project={project} />
    </>
  );
}
