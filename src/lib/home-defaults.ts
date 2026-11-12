/** Default homepage layout: used by the seed and as the runtime fallback when no sections exist. */
import type { SectionType } from "@/lib/validation";

export type HomeSectionDefault = { key: string; type: SectionType; visible: boolean; config: Record<string, unknown> };

export const HOME_INTRO = {
  eyebrow: "About me",
  title: "Practical software for organisations that need it to work.",
  description: "",
  body:
    "I design, build and run software for businesses and institutions — from custom web applications and management systems to the servers and integrations behind them.\n\nMy focus is on understanding how an organisation really operates, then building technology that removes friction instead of adding it.",
  imageId: null,
  cta: { label: "More about me", href: "/about" },
};

export const HOME_PROCESS_STEPS = [
  { title: "Discover", description: "We clarify the problem, the people involved and what success looks like." },
  { title: "Design", description: "I propose the scope, data model and architecture before any production code." },
  { title: "Build", description: "Working software is delivered in small, reviewable increments." },
  { title: "Launch & support", description: "Deployment, monitoring and backups are set up, then the system is maintained." },
];


export const DEFAULT_HOME_SECTIONS: HomeSectionDefault[] = [
  {
    key: "hero",
    type: "HERO",
    visible: true,
    config: {
      eyebrow: "Software Engineer · Full-Stack Developer · Systems Builder",
      title: "Hi, I'm Isaac Nyamari.",
      highlight: "I build software that solves real-world problems.",
      subtitle:
        "I'm a software engineer and technology entrepreneur focused on building web applications, business systems, and practical technology solutions that help organizations work smarter.",
      primaryCta: { label: "Explore My Work", href: "/projects" },
      secondaryCta: { label: "Let's Work Together", href: "/contact" },
      imageId: null,
      backgroundImageId: null,
      stats: [],
    },
  },
  { key: "intro", type: "INTRO", visible: true, config: HOME_INTRO },
  {
    key: "services",
    type: "SERVICES",
    visible: true,
    config: {
      eyebrow: "What I do",
      title: "Five ways I help organisations build.",
      description: "From the first line of code to the server it runs on.",
      serviceIds: [],
    },
  },
  {
    key: "projects",
    type: "PROJECTS",
    visible: true,
    config: { eyebrow: "Selected work", title: "Featured projects.", description: "", projectIds: [], limit: 3 },
  },
  {
    key: "skills",
    type: "SKILLS",
    visible: true,
    config: { eyebrow: "Technical expertise", title: "What I work with.", description: "" },
  },
  {
    key: "process",
    type: "PROCESS",
    visible: true,
    config: {
      eyebrow: "How I work",
      title: "A clear process from idea to production.",
      description: "",
      steps: HOME_PROCESS_STEPS,
    },
  },
  {
    key: "insights",
    type: "INSIGHTS",
    visible: true,
    config: { eyebrow: "Insights", title: "Notes from the build.", description: "", postIds: [], limit: 3 },
  },
  {
    key: "contact",
    type: "CONTACT_CTA",
    visible: true,
    config: {
      eyebrow: "Get in touch",
      title: "Let's build something that works.",
      description: "Tell me about the system you need, the problem you're solving or the project you're planning.",
      cta: { label: "Start a project", href: "/contact" },
      showContactMethods: true,
    },
  },
];
