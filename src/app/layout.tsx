import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '../styles/btn-gold-glow.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Security Broker SB | A plataforma do corretor inteligente",
  description: "O Sistema Operacional do Corretor Moderno. CRM, gestão de imóveis, rede multinível e SB Academy em uma única plataforma.",
  keywords: ['corretor', 'imobiliária', 'CRM', 'gestão', 'multinível', 'academy'],
  authors: [{ name: 'Security Broker SB' }],
  creator: 'Security Broker SB',
  publisher: 'Security Broker SB',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1A1A1A',
              color: '#fff',
              border: '1px solid #D4AF37',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#D4AF37',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#DC2626',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
