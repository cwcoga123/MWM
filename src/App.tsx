import { AuthGate } from './components/shell/AuthGate'
import { AppShell } from './components/shell/AppShell'

export default function App() {
  return (
    <AuthGate>
      {(user, signOut) => <AppShell user={user} onSignOut={signOut} />}
    </AuthGate>
  )
}
