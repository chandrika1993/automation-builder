
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/** @type {import('next').NextConfig} */
const __dirname = dirname(fileURLToPath(import.meta.url));

// `npm run build:demo` sets DEMO_EXPORT=1: a static site where the
// /api/automations routes run in the browser (see src/demo). Regular builds
// are unchanged.
const isDemo = process.env.DEMO_EXPORT === "1";

const nextConfig = {
    turbopack: {
        root: __dirname,
      },
    ...(isDemo && {
        output: "export",
        // Route handlers are .ts files: leaving .ts out of the page extensions
        // keeps them out of the static export. The demo answers them in the browser.
        pageExtensions: ["tsx"],
        images: { unoptimized: true },
    }),
};

export default nextConfig;
