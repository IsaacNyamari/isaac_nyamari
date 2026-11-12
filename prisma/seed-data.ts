import { docFromBlocks } from "../src/lib/rich-text/model";

export const SERVICES = [
  {
    slug: "custom-software-development",
    title: "Custom Software Development",
    icon: "code",
    summary:
      "Web applications, workflow digitisation and APIs built around how your organisation actually works — and maintained after launch.",
    deliverables: [
      "Custom web applications",
      "Business workflow digitization",
      "Database-driven applications",
      "API development",
      "Application integration",
      "Software maintenance and improvements",
    ],
    content: docFromBlocks(
      "Off-the-shelf software rarely fits a growing organisation for long. I design and build applications around your real processes, so your team spends time on the work instead of working around the tools.",
      { h2: "What this covers" },
      { list: [
        "Custom web applications for internal teams, customers or partners",
        "Digitising paper-based or spreadsheet workflows",
        "Database-driven applications with reporting",
        "API development and application integration",
        "Ongoing maintenance, fixes and improvements to existing software",
      ] },
      { h2: "How we start" },
      "Every engagement starts with understanding the problem: who uses the system, what slows them down today, and what a successful outcome looks like. From there I propose a scope, an architecture and a delivery plan before writing production code.",
    ),
  },
  {
    slug: "website-design-and-development",
    title: "Website Design and Development",
    icon: "layout",
    summary:
      "Fast, well-structured websites for individuals and organisations — from personal sites and landing pages to full redesigns.",
    deliverables: [
      "Personal websites",
      "Corporate websites",
      "Business landing pages",
      "Portfolio and content websites",
      "Website redesigns",
      "Performance and technical SEO improvements",
    ],
    content: docFromBlocks(
      "A website is often the first conversation someone has with you. I build sites that load quickly, read well on every device and are easy for your team to keep up to date.",
      { h2: "What this covers" },
      { list: [
        "Personal, portfolio and content websites",
        "Corporate websites and business landing pages",
        "Redesigns of existing websites",
        "Performance optimisation and technical SEO",
        "Content management so you can edit without a developer",
      ] },
    ),
  },
  {
    slug: "business-management-systems-and-saas",
    title: "Business Management Systems and SaaS",
    icon: "building",
    summary:
      "Management platforms for schools, healthcare, HR, utilities and ISPs — including multi-tenant SaaS products.",
    deliverables: [
      "School management systems",
      "Hospital and pharmacy systems",
      "HRM and ERP applications",
      "Water billing platforms",
      "ISP management systems",
      "Multi-tenant SaaS platforms",
    ],
    content: docFromBlocks(
      "Business management systems sit at the centre of daily operations. I build platforms that handle records, billing, reporting and access control reliably, and that can grow from one organisation to many.",
      { h2: "Typical systems" },
      { list: [
        "School management systems",
        "Hospital and pharmacy systems",
        "HRM and ERP applications",
        "Water billing platforms",
        "ISP management systems",
        "Multi-tenant SaaS platforms",
      ] },
    ),
  },
  {
    slug: "systems-architecture-and-infrastructure",
    title: "Systems Architecture and Infrastructure",
    icon: "server",
    summary:
      "Linux servers, deployments, DNS and web servers configured properly — plus monitoring and backups so production stays up.",
    deliverables: [
      "Linux server administration",
      "Application deployment",
      "Domain and DNS configuration",
      "Web server configuration",
      "Production troubleshooting",
      "Monitoring, backups, and infrastructure reliability",
    ],
    content: docFromBlocks(
      "Good software still fails on poorly run infrastructure. I set up, deploy and maintain the servers and services your applications depend on, with monitoring and backups in place from day one.",
      { h2: "What this covers" },
      { list: [
        "Linux server administration and hardening",
        "Application deployment pipelines",
        "Domain, DNS and web server configuration",
        "Production troubleshooting",
        "Monitoring, backups and reliability improvements",
      ] },
    ),
  },
  {
    slug: "api-integration-and-technology-consulting",
    title: "API Integration and Technology Consulting",
    icon: "plug",
    summary:
      "REST APIs, payment gateways, third-party services and devices connected cleanly — and honest technical advice on architecture.",
    deliverables: [
      "REST API development and integration",
      "Payment gateway integration",
      "Third-party integrations",
      "Hardware and device integrations",
      "Database integration",
      "Software architecture and technical consulting",
    ],
    content: docFromBlocks(
      "Most systems need to talk to other systems. I design and build integrations that are secure, observable and documented, and I help teams make sound architecture decisions before they become expensive to change.",
      { h2: "What this covers" },
      { list: [
        "REST API development and integration",
        "Payment gateway integration",
        "Third-party service integrations",
        "Hardware and device integrations",
        "Database integration",
        "Software architecture reviews and technical consulting",
      ] },
    ),
  },
];

export const CATEGORIES = [
  { slug: "software-engineering", name: "Software Engineering", description: "Building and maintaining software that lasts." },
  { slug: "business-systems", name: "Business Systems", description: "Management systems, SaaS and digitising operations." },
  { slug: "infrastructure", name: "Infrastructure", description: "Servers, deployment, DNS and reliability." },
  { slug: "integrations", name: "Integrations", description: "APIs, payments and connecting systems." },
];

export const PROJECT_CATEGORIES = [
  { slug: "web-applications", name: "Web Applications" },
  { slug: "business-systems", name: "Business Systems" },
  { slug: "websites", name: "Websites" },
  { slug: "infrastructure", name: "Infrastructure" },
  { slug: "integrations", name: "Integrations" },
];

/** Areas taken from the stated professional focus. Review and adjust in Admin → Skills. */
export const SKILLS: { name: string; category: string; icon: string }[] = [
  { name: "Full-stack web development", category: "Software", icon: "code" },
  { name: "Database design", category: "Software", icon: "database" },
  { name: "REST API development", category: "Software", icon: "plug" },
  { name: "Multi-tenant SaaS", category: "Software", icon: "layers" },
  { name: "Linux server administration", category: "Infrastructure", icon: "terminal" },
  { name: "Web server configuration", category: "Infrastructure", icon: "server" },
  { name: "Domain and DNS management", category: "Infrastructure", icon: "globe" },
  { name: "Monitoring and backups", category: "Infrastructure", icon: "shield" },
  { name: "Payment gateway integration", category: "Integrations", icon: "credit-card" },
  { name: "Hardware and device integration", category: "Integrations", icon: "cpu" },
  { name: "Software architecture", category: "Consulting", icon: "workflow" },
  { name: "Technology consulting", category: "Consulting", icon: "lightbulb" },
];

export const ABOUT = {
  title: "About",
  excerpt: "Software engineer, full-stack developer, systems builder and technology entrepreneur based in Kenya.",
  content: docFromBlocks(
    "I'm Isaac Nyamari, a software engineer, full-stack developer, systems builder and technology entrepreneur based in Kenya.",
    "My work focuses on software development, business management systems, SaaS, APIs, infrastructure and technology consulting — the practical systems organisations rely on every day.",
    "I enjoy taking a messy, manual process and turning it into software that is clear, dependable and easy to use. That means caring about the whole picture: the data model, the user interface, the integrations and the servers it all runs on.",
  ),
  data: {
    headline: "I build software that solves real-world problems.",
    philosophy: [
      { title: "Start with the problem", description: "Software is only useful if it fixes something real. I spend time understanding the workflow before proposing a solution." },
      { title: "Build for the people using it", description: "Clear interfaces and sensible defaults matter more than clever features." },
      { title: "Production is part of the job", description: "Deployment, monitoring, backups and security are designed in, not added at the end." },
      { title: "Keep it maintainable", description: "Readable code, documented decisions and simple architecture keep systems affordable to run." },
    ],
    interests: ["Business management systems", "SaaS platforms", "API design", "Linux infrastructure", "Payment integrations", "Hardware and device integration"],
    specializations: [
      { title: "Business systems & SaaS", description: "School, healthcare, HR, billing and ISP management platforms, including multi-tenant SaaS." },
      { title: "Full-stack web development", description: "Web applications and websites from database to interface." },
      { title: "Infrastructure", description: "Linux servers, deployment, DNS, web servers, monitoring and backups." },
      { title: "Integrations", description: "REST APIs, payment gateways, third-party services and devices." },
    ],
    ctaTitle: "Have a system in mind?",
    ctaText: "Tell me what you're trying to build or fix, and I'll suggest a practical way forward.",
    showSkills: true,
  },
};

export const PRIVACY = {
  title: "Privacy Policy",
  excerpt: "What information this website collects, why, and how it is handled.",
  content: docFromBlocks(
    "This policy explains what information this website collects and how it is used. It reflects the features the site actually has.",
    { h2: "Information you send through the contact form" },
    "When you submit the project inquiry form, the following is stored so I can reply to you: your name, email address, optional phone number, the service you selected, an optional budget range, your message and your consent confirmation.",
    { h2: "Technical information" },
    "To protect the form from spam and abuse, a one-way hash of your IP address and your browser's user-agent string are stored with the inquiry and used for rate limiting. The original IP address is not stored.",
    { h2: "Cookies" },
    "Public pages do not set tracking or advertising cookies. Strictly necessary cookies are used only for the site administrator's signed-in session and for previewing unpublished content.",
    { h2: "Email" },
    "When you submit an inquiry, a notification containing your message is sent to the site owner through an email delivery provider. Your details are not added to mailing lists.",
    { h2: "Embedded content" },
    "Some articles may embed videos from YouTube (using its privacy-enhanced mode) or Vimeo. Those services may collect information under their own policies when you play an embedded video.",
    { h2: "Retention and your rights" },
    "Inquiries are kept for as long as needed to respond and manage the resulting work, and can be deleted on request. To ask for a copy of your information or for it to be deleted, use the contact details on the contact page.",
    { h2: "Changes" },
    "This policy may be updated when the website's features change. The date of the latest update is shown on this page.",
  ),
};
