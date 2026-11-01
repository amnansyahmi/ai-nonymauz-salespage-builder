import "@/styles/builder.css";
import "@/styles/studio.css";
import { FONTS, fontsURL } from "@/lib/theme";

/* The builder loads its own interface face plus every salespage face, so previews and thumbnails render true. */
const BUILDER_FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400&display=swap";

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={BUILDER_FONTS} precedence="default" />
      <link
        rel="stylesheet"
        href={fontsURL(Object.keys(FONTS))}
        precedence="default"
      />
      <div id="app">{children}</div>
    </>
  );
}
