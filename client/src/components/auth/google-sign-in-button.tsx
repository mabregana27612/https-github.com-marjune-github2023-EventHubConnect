import { Button } from '@/components/ui/button';
import { FaGoogle } from 'react-icons/fa';

interface GoogleSignInButtonProps {
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  text?: string;
  fullWidth?: boolean;
}

export function GoogleSignInButton({
  variant = 'default',
  size = 'default',
  text = 'Sign in with Google',
  fullWidth = false,
}: GoogleSignInButtonProps) {
  // Now using direct OAuth endpoint instead of Firebase
  const handleSignIn = () => {
    // Redirect to the server's Google OAuth endpoint
    window.location.href = "/api/auth/google";
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleSignIn}
      className={`${fullWidth ? 'w-full' : ''} flex items-center justify-center`}
    >
      <FaGoogle className="mr-2 h-4 w-4" />
      {text}
    </Button>
  );
}