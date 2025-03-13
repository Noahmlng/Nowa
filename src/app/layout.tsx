import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

/**
 * Load the Inter font from Google Fonts
 * This creates a font object that can be applied to elements
 * The 'latin' subset is loaded for better performance
 */
const inter = Inter({ subsets: ['latin'] });

/**
 * Metadata for the application
 * This information is used for SEO and browser tabs
 */
export const metadata: Metadata = {
  title: 'Nowa - AI Todo App',
  description: 'An AI-powered todo app to help you manage your tasks and goals',
};

/**
 * Root Layout Component
 * 
 * This is the main layout wrapper for the entire application.
 * It wraps all pages and provides common elements like fonts and global styles.
 * In Next.js, the layout component is used to maintain state across page navigations.
 * 
 * @param children - The page content to be rendered inside the layout
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
} 