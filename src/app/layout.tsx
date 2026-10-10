import type { Metadata } from "next";
import "./globals.css";
import { ActionProvider } from "@/components/action-provider";
import { mutate, authenticate, signOut } from "@/lib/actions";
export const metadata: Metadata = {
  title: { default: "KCC Secret Friend", template: "%s · KCC Secret Friend" },
  description:
    "Small gestures. A closer community. The Korean Culture Club’s monthly Secret Friend.",
  robots: { index: false, follow: false },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#285648",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ActionProvider actions={{ mutate, authenticate, signOut }}>
          {children}
        </ActionProvider>
      </body>
    </html>
  );
}
