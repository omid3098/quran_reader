import './globals.css'

export const metadata = {
  title: 'OpenQuranReader',
  description: 'Read the Quran with translations',
}

function ThemeScript() {
  // Persisted theme in localStorage
  const code = `try{const t=localStorage.getItem('oqr:theme')||'dark';document.documentElement.dataset.theme=t}catch{}`
  // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
  return <script dangerouslySetInnerHTML={{ __html: code }} suppressHydrationWarning />
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeScript />
        {children}
      </body>
    </html>
  )
}

