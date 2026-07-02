
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, CheckCircle, Target } from "lucide-react";

interface AnalyticsDashboardProps {
  data?: {
    userGrowth?: Array<{ date: string; count: number }>;
    taskCompletion?: Array<{ task: string; completed: number; total: number }>;
    totalUsers?: number;
    activeTasks?: number;
  };
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{data?.totalUsers || 0}</p>
            </div>
          </div>
        </div>
      </Card>
      
      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <Target className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Tasks</p>
              <p className="text-2xl font-bold">{data?.activeTasks || 0}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <CheckCircle className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold">85%</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <TrendingUp className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Growth</p>
              <p className="text-2xl font-bold">+12%</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
