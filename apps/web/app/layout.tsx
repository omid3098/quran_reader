import './globals.css'

export const metadata = {
  title: 'OpenQuranReader',
  description: 'Read the Quran with translations',
}

function ThemeScript() {
  // Persisted theme in localStorage
  const code = `try{const t=localStorage.getItem('oqr:theme')||'dark';document.documentElement.dataset.theme=t}catch{}`
  return <script dangerouslySetInnerHTML={{ __html: code }} suppressHydrationWarning />
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeScript />
        {children}
      </body>
    </html>
  )
}

