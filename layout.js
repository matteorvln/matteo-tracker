export const metadata = {
  title: 'Matteo Tracker',
  description: 'Personal finance tracker',
  manifest: '/manifest.json',
  themeColor: '#0a0a0f',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0f' }}>
        {children}
      </body>
    </html>
  )
}
