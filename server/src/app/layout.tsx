// This project is API-only — see src/app/api/**. This layout exists
// only because Next.js App Router requires a root layout file.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
