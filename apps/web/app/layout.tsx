export const metadata = {
  title: 'OpenQuranReader',
  description: 'Read the Quran with translations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="rtl">
      <body>{children}</body>
    </html>
  )
}

