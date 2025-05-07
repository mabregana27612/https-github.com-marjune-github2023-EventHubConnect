import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
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
  const { signInWithGoogle, isLoading } = useFirebaseAuth();
  const [localLoading, setLocalLoading] = useState(false);

  const handleSignIn = async () => {
    setLocalLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleSignIn}
      disabled={isLoading || localLoading}
      className={`${fullWidth ? 'w-full' : ''} flex items-center justify-center`}
    >
      {isLoading || localLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <FaGoogle className="mr-2 h-4 w-4" />
      )}
      {text}
    </Button>
  );
}