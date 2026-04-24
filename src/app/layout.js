import './globals.css'

export const metadata = {
  title: 'Matteo Tracker',
  description: 'Expense tracker personnel',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
