import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Users, BookOpen, Shield, GraduationCap, Loader2, LayoutDashboard } from 'lucide-react';

interface AdminUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  quizCount: number;
}

const HeadAdminDashboard = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [students, setStudents] = useState<{ userId: string; name: string; email: string }[]>([]);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    // Get all roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    // Get all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email');

    // Get quiz counts per admin
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, created_by');

    // Get total results
    const { data: results } = await supabase
      .from('results')
      .select('id');

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const quizCountMap: Record<string, number> = {};
    (quizzes || []).forEach(q => {
      quizCountMap[q.created_by] = (quizCountMap[q.created_by] || 0) + 1;
    });

    const adminList: AdminUser[] = [];
    const studentList: { userId: string; name: string; email: string }[] = [];

    (roles || []).forEach(r => {
      const profile = profileMap.get(r.user_id);
      if (!profile) return;

      if (r.role === 'admin') {
        adminList.push({
          userId: r.user_id,
          name: profile.name,
          email: profile.email,
          role: r.role,
          quizCount: quizCountMap[r.user_id] || 0,
        });
      } else if (r.role === 'student') {
        studentList.push({
          userId: r.user_id,
          name: profile.name,
          email: profile.email,
        });
      }
    });

    setAdmins(adminList);
    setStudents(studentList);
    setTotalQuizzes((quizzes || []).length);
    setTotalResults((results || []).length);
    setIsLoading(false);
  };

  const stats = [
    { label: 'Total Admins', value: admins.length, icon: Shield, color: 'text-primary' },
    { label: 'Total Students', value: students.length, icon: GraduationCap, color: 'text-accent' },
    { label: 'Total Quizzes', value: totalQuizzes, icon: BookOpen, color: 'text-success' },
    { label: 'Total Attempts', value: totalResults, icon: Users, color: 'text-warning' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Head Admin Dashboard" subtitle="Overview of all platform activity">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Head Admin Dashboard" subtitle="Overview of all platform activity">
      {/* Quick Link to Admin Panel */}
      <div className="mb-6">
        <Link to="/admin">
          <Button variant="hero" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Go to Quiz Management
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="border-border/50">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`rounded-xl p-3 bg-muted ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admins Section */}
      <div className="mb-8">
        <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
          <Crown className="h-5 w-5 text-accent" />
          All Admins
        </h2>

        {admins.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No admins yet</h3>
              <p className="text-muted-foreground text-center">
                Admins will appear here when they register
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {admins.map((admin) => (
              <Card key={admin.userId} className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-lg">{admin.name}</CardTitle>
                    <Badge variant="secondary">Admin</Badge>
                  </div>
                  <CardDescription>{admin.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{admin.quizCount} quizzes created</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Students Section */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-accent" />
          All Students ({students.length})
        </h2>

        {students.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No students yet</h3>
              <p className="text-muted-foreground text-center">
                Students will appear here when they register
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.userId} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{student.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{student.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HeadAdminDashboard;
