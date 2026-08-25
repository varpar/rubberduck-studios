import { getSiteUrl, site } from "@/app/_data/site";

type JsonLdObject = Record<string, unknown>;

type JsonLdProps = {
  data: JsonLdObject;
};

export type ServiceKey = "workflowAutomation" | "productDevelopment";

type PageSchema = {
  path: "/work" | "/about" | "/contact";
  name: string;
  description: string;
  image: string;
  type?: "WebPage" | "ContactPage";
  serviceKeys?: ServiceKey[];
};

const services: Record<
  ServiceKey,
  { name: string; description: string; fragment: string }
> = {
  workflowAutomation: {
    name: "Workflow automation",
    description:
      "Design and build of useful workflow automation, AI-assisted messaging, and handoffs between the tools a team already uses.",
    fragment: "workflow-automation",
  },
  productDevelopment: {
    name: "Focused product development",
    description:
      "Design and build of focused digital products and web applications around a clear next step.",
    fragment: "product-development",
  },
};

/**
 * Native script tags are intentional: Next recommends server-rendering JSON-LD
 * in a layout or page rather than loading it through next/script. Escaping
 * angle brackets follows the Next JSON-LD guidance and prevents a value from
 * breaking out of the script element.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function pageUrl(path: string) {
  const siteUrl = getSiteUrl();
  return siteUrl ? new URL(path, `${siteUrl}/`).toString() : undefined;
}

function organizationId() {
  const siteUrl = getSiteUrl();
  return siteUrl ? `${siteUrl}/#organization` : undefined;
}

function websiteId() {
  const siteUrl = getSiteUrl();
  return siteUrl ? `${siteUrl}/#website` : undefined;
}

function serviceId(key: ServiceKey) {
  const siteUrl = getSiteUrl();
  return siteUrl ? `${siteUrl}/#${services[key].fragment}` : undefined;
}

function organizationReference() {
  const id = organizationId();
  return id ? { "@id": id } : { "@type": "Organization", name: site.studio };
}

function getServiceSchema(key: ServiceKey): JsonLdObject {
  const service = services[key];
  const id = serviceId(key);

  return {
    "@type": "Service",
    ...(id ? { "@id": id } : {}),
    name: service.name,
    description: service.description,
    provider: organizationReference(),
  };
}

function getServiceReference(key: ServiceKey): JsonLdObject {
  const id = serviceId(key);
  return id ? { "@id": id } : getServiceSchema(key);
}

/**
 * Site-wide entities. Every value is supported by visible site content; there
 * are deliberately no ratings, location, phone number, social profiles, or
 * pricing data because none have been supplied by the studio. URL-based
 * fields are emitted only when SITE_URL (or the legacy NEXT_PUBLIC_SITE_URL)
 * contains a valid HTTPS URL.
 */
export function getSiteJsonLd(): JsonLdObject {
  const siteUrl = getSiteUrl();
  const organization = organizationId();
  const graph: JsonLdObject[] = [
    {
      "@type": "Organization",
      ...(organization ? { "@id": organization } : {}),
      name: site.studio,
      ...(siteUrl ? { url: `${siteUrl}/` } : {}),
      email: site.email,
      description:
        "An independent studio for thoughtful automations and focused digital products.",
      slogan: "Talk it out. Ship it out.",
      founder: {
        "@type": "Person",
        name: "Varun",
        jobTitle: "Founder & builder",
      },
    },
    getServiceSchema("workflowAutomation"),
    getServiceSchema("productDevelopment"),
  ];

  const website = websiteId();
  if (siteUrl && website) {
    graph.splice(1, 0, {
      "@type": "WebSite",
      "@id": website,
      name: site.studio,
      url: `${siteUrl}/`,
      publisher: organizationReference(),
      inLanguage: "en",
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

function breadcrumbItem(position: number, name: string, path: string) {
  const item = pageUrl(path);
  return item
    ? {
        "@type": "ListItem",
        position,
        name,
        item,
      }
    : undefined;
}

/** A page-level graph used only by the corresponding server route. */
export function getPageJsonLd({
  path,
  name,
  description,
  image,
  type = "WebPage",
  serviceKeys,
}: PageSchema): JsonLdObject {
  const url = pageUrl(path);
  const website = websiteId();
  const breadcrumbId = url ? `${url}#breadcrumb` : undefined;
  const page: JsonLdObject = {
    "@type": type,
    ...(url ? { "@id": `${url}#webpage`, url } : {}),
    name,
    description,
    inLanguage: "en",
    ...(website ? { isPartOf: { "@id": website } } : {}),
    about: organizationReference(),
    ...(serviceKeys?.length
      ? { mainEntity: serviceKeys.map(getServiceReference) }
      : { mainEntity: organizationReference() }),
    ...(url
      ? {
          primaryImageOfPage: {
            "@type": "ImageObject",
            contentUrl: new URL(image, `${getSiteUrl()}/`).toString(),
          },
        }
      : {}),
    ...(breadcrumbId ? { breadcrumb: { "@id": breadcrumbId } } : {}),
  };

  const homeItem = breadcrumbItem(1, "Home", "/");
  const currentItem = breadcrumbItem(
    2,
    name.replace(" — Rubberduck", ""),
    path,
  );

  return {
    "@context": "https://schema.org",
    "@graph": [
      page,
      ...(breadcrumbId && homeItem && currentItem
        ? [
            {
              "@type": "BreadcrumbList",
              "@id": breadcrumbId,
              itemListElement: [homeItem, currentItem],
            },
          ]
        : []),
    ],
  };
}
