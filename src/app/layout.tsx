import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import CloudSync from "@/components/CloudSync";

export const viewport: Viewport = {
  themeColor: "#8B5CF6",
};

export const metadata: Metadata = {
  title: "TravelGuide — Side Quests for Every Trip",
  description:
    "Discover hidden gems, scenic detours, and local favorites along your route. Your AI-powered road trip companion.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TravelGuide",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');else if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;
  const swScript = `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').then(function(reg){reg.addEventListener('updatefound',function(){var w=reg.installing;if(w){w.addEventListener('statechange',function(){if(w.state==='activated'&&navigator.serviceWorker.controller){var d=document.createElement('div');d.innerHTML='<div style="position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#8B5CF6;color:white;padding:10px 20px;border-radius:12px;font-size:14px;z-index:9999;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3)">New version available — tap to refresh</div>';d.firstChild.onclick=function(){window.location.reload()};document.body.appendChild(d.firstChild)}})}})})}}`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="antialiased min-h-screen">
        <AuthGuard>
          <CloudSync />
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}
