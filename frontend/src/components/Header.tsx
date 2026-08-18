import { AuthButton } from './AuthButton';
import { ThemeToggle } from './ThemeToggle';
import { User } from '../firebase';

interface HeaderProps {
  user: User | null;
  authLoading: boolean;
}

export function Header({ user, authLoading }: HeaderProps) {
  return (
    <header className="header">
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <ThemeToggle />
        <AuthButton user={user} authLoading={authLoading} />
      </div>
      <h1>Quiz Islamique</h1>
      <p>Testez vos connaissances et posez vos questions grâce à l'Intelligence Artificielle.</p>
    </header>
  );
}
