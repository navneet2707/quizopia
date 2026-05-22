import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Crown, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';

const ClaimRole = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [role, setRole] = useState<'admin' | 'head_admin'>('admin');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Enter your access code');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('claim-role', {
      body: { role, code: code.trim() },
    });
    setLoading(false);

    if (error || (data && data.error)) {
      toast.error(data?.error || error?.message || 'Failed to claim role');
      return;
    }

    toast.success(`You are now ${role === 'head_admin' ? 'Head Admin' : 'Admin'}. Please sign in again.`);
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-md py-12">
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
              <KeyRound className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">Become an Admin</CardTitle>
            <CardDescription>
              {user ? `Signed in as ${user.email}. ` : ''}
              Enter your access code to elevate your account.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label>Role to claim</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(v) => setRole(v as 'admin' | 'head_admin')}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    { value: 'admin', label: 'Admin', icon: Shield },
                    { value: 'head_admin', label: 'Head Admin', icon: Crown },
                  ].map((opt) => (
                    <Label
                      key={opt.value}
                      htmlFor={opt.value}
                      className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 p-4 text-center transition-all ${
                        role === opt.value
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                      <opt.icon className={`h-5 w-5 ${role === opt.value ? 'text-accent' : 'text-muted-foreground'}`} />
                      <span className="font-medium text-sm">{opt.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Access Code</Label>
                <Input
                  id="code"
                  type="password"
                  placeholder="Enter access code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Codes are issued by the institution. Contact your administrator if you don't have one.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="hero" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>Claim role <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ClaimRole;
