import { projects } from "@/lib/data";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <main style={{ padding: "2rem", fontFamily: "var(--font-mono)", color: "#f0f0f0" }}>
      <a href="/" style={{ color: "#888", textDecoration: "none", fontSize: "0.85rem" }}>
        ← Back
      </a>
      <h1 style={{ marginTop: "2rem", fontSize: "2rem" }}>{project.title}</h1>
      <p style={{ color: "#666", marginTop: "0.5rem" }}>{project.year}</p>
    </main>
  );
}
