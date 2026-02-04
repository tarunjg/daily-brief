import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Providers } from '@/components/layout/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Daily Brief – Your Personal Learning Log',
  description: 'A personalized daily news brief with integrated reflection and learning log.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                fontFamily: 'var(--font-geist-sans)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
