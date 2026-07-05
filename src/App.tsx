import { AuthGate } from './components/AuthGate'
import { AppShell } from './components/AppShell'

export default function App() {
  return (
    <AuthGate>
      {(user, signOut) => <AppShell user={user} onSignOut={signOut} />}
    </AuthGate>
  )
}
