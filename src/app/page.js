'use client'
import dynamic from 'next/dynamic'

const ExpenseTracker = dynamic(() => import('@/components/ExpenseTracker'), { ssr: false })

export default function Home() {
  return <ExpenseTracker />
}
