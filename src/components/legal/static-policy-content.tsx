type StaticPolicyContentProps = {
  html: string;
};

/** Renders Termly HTML export. Source file must live in content/legal/*.html */
export function StaticPolicyContent({ html }: StaticPolicyContentProps) {
  return (
    <div
      className="legal-static"
      // Trusted static HTML from repo (Termly export), not user input.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
