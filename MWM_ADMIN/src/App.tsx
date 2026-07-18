import { AdminAuthGate } from './components/shell/AdminAuthGate'
import { AdminShell } from './components/shell/AdminShell'

export default function App() {
  return (
    <AdminAuthGate>
      {(user, signOut) => <AdminShell user={user} onSignOut={signOut} />}
    </AdminAuthGate>
  )
}
