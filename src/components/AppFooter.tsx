import { Link } from "react-router-dom";

const footerSections = [
  {
    title: "STUDIOS",
    links: [
      { label: "AI Developer", href: "/code" },
      { label: "AI Designer", href: "/designer" },
      { label: "AI Music", href: "/music" },
      { label: "AI Video", href: "/video" },
    ],
  },
  {
    title: "PRODUCTIVITY",
    links: [
      { label: "AI Slides", href: "/slides" },
      { label: "AI Sheets", href: "/sheets" },
      { label: "AI Docs", href: "/docs" },
      { label: "AI Meeting Notes", href: "/meeting-notes" },
    ],
  },
  {
    title: "INTELLIGENCE",
    links: [
      { label: "AI Chat Unlimited", href: "/chat" },
      { label: "AI Image Studio", href: "/image" },
      { label: "Custom Agent", href: "/custom-agent" },
      { label: "All Agents Hub", href: "/agents" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "Business", href: "/business" },
      { label: "Pricing", href: "/pricing" },
      { label: "Help Center", href: "/helpcenter" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
];

const AppFooter = () => {
  return (
    <footer className="border-t border-border px-4 py-10 sm:px-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
        {footerSections.map((section) => (
          <div key={section.title}>
            <h4 className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground">
              {section.title}
            </h4>
            <ul className="space-y-2.5">
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-foreground transition-colors hover:text-muted-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 max-w-5xl border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GUIDESOFT. All rights reserved.
      </div>
    </footer>
  );
};

export default AppFooter;
