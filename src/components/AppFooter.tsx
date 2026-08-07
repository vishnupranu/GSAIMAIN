import { Link } from "react-router-dom";

const footerSections = [
  {
    title: "PRODUCTS",
    links: [
      { label: "AI Browser", href: "/" },
      { label: "Speakly", href: "/" },
    ],
  },
  {
    title: "TOOLS",
    links: [
      { label: "AI Slides", href: "/" },
      { label: "AI Docs", href: "/" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "Business", href: "/business" },
      { label: "Pricing", href: "/pricing" },
      { label: "Help Center", href: "/helpcenter" },
      { label: "Privacy", href: "/" },
      { label: "Terms", href: "/" },
    ],
  },
  {
    title: "AGENTS",
    links: [
      { label: "All Agents", href: "/agents" },
      { label: "Custom Agent", href: "/" },
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
        © {new Date().getFullYear()} Genspark. All rights reserved.
      </div>
    </footer>
  );
};

export default AppFooter;
