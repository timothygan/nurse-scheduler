import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to sign in page - users should always authenticate first
  redirect('/auth/signin')
}
