import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Users, Target, Rocket, DollarSign, Globe, CheckSquare } from "lucide-react";

interface ChartData {
  name: string;
  value: number;
  change?: number;
  color?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  gradient: string;
  description?: string;
}

export function MetricCard({ title, value, change, icon, gradient, description }: MetricCardProps) {
  const isPositive = change && change > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group"
    >
      <Card className="relative overflow-hidden border-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradient}`} />
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white`}>
              {icon}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            <motion.div 
              className="text-2xl font-bold"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {value}
            </motion.div>
            
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositive ? '+' : ''}{change}%
                </span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            )}
            
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ProgressChart({ data, title }: { data: ChartData[]; title: string }) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="space-y-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">{item.value}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${item.color || 'from-primary to-purple-600'} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxValue) * 100}%` }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

export function CircularProgress({ 
  value, 
  max, 
  label, 
  gradient = "from-primary to-purple-600" 
}: { 
  value: number; 
  max: number; 
  label: string; 
  gradient?: string;
}) {
  const percentage = (value / max) * 100;
  const strokeDasharray = 2 * Math.PI * 45;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;
  
  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted/20"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke="url(#gradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDasharray, strokeDashoffset: strokeDasharray }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="text-primary" stopColor="currentColor" />
              <stop offset="100%" className="text-purple-600" stopColor="currentColor" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span 
            className="text-lg font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {Math.round(percentage)}%
          </motion.span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{value} / {max}</p>
      </div>
    </div>
  );
}

export function RealtimeMetrics({ metrics }: { metrics: any }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Total Users"
          value={`${metrics?.totalUsers || 0}+`}
          icon={<Users className="h-4 w-4" />}
          gradient="from-blue-500 to-blue-600"
          description="Registered users on app"
        />
        
        <MetricCard
          title="Total Tasks"
          value={metrics?.totalTasks || 0}
          icon={<CheckSquare className="h-4 w-4" />}
          gradient="from-green-500 to-green-600"
          description="Tasks ever created"
        />
        
        <MetricCard
          title="Promotion Requests"
          value={metrics?.totalPromotionRequests || 0}
          icon={<Rocket className="h-4 w-4" />}
          gradient="from-purple-500 to-purple-600"
          description="Total requests submitted"
        />
        
        <MetricCard
          title="Promotion Revenue"
          value={`$${metrics?.totalPromotionRevenue || '0.00'}`}
          icon={<DollarSign className="h-4 w-4" />}
          gradient="from-emerald-500 to-emerald-600"
          description="Total amount from promotions"
        />
      </div>

      {metrics?.analytics?.regionalDistribution && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Regional Distribution</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(metrics.analytics.regionalDistribution)
                .sort(([, a]: any, [, b]: any) => b - a)
                .slice(0, 5)
                .map(([region, count]: any, index: number) => {
                  const total = Object.values(metrics.analytics.regionalDistribution).reduce((sum: number, val: any) => sum + val, 0) as number;
                  const percentage = ((count / total) * 100).toFixed(1);
                  return (
                    <motion.div
                      key={region}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.4 }}
                      className="space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{region}</span>
                        <span className="text-sm text-muted-foreground">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: index * 0.1 + 0.2, duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Activity Overview</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Active Tasks</span>
                <span className="text-lg font-bold text-green-500">{metrics?.activeTasks || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Completed Tasks</span>
                <span className="text-lg font-bold text-blue-500">{metrics?.totalCompletions || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">System Health</span>
                <Badge variant="default" className="bg-green-500">{metrics?.systemHealth || "Unknown"}</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}