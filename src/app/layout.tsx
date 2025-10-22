import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SharedProvider } from './providers/timer'
import { SettingsProvider } from './providers/settings'
import 'react-simple-toasts/dist/style.css';
import 'react-simple-toasts/dist/theme/dark.css';
import { toastConfig } from 'react-simple-toasts'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AGC Timer Control',
  description: 'Manage ProPresenter timer and church event time.',
}

toastConfig({
  theme: 'dark',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SharedProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </SharedProvider>
      </body>
    </html>
  )
}
