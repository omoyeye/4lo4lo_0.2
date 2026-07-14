"use client";

import { Progress } from "@/components/ui/progress";
import { 
  Globe, 
  Zap, 
  Users, 
  Award,
  LucideIcon
} from "lucide-react";
import { type MilestoneWithProgress } from "@shared/schema";

type MilestoneCardProps = {
  title: string;
  description: string;
  progress: number;
  progressColor: string;
  icon: React.ReactNode;
  iconBgClass: string;
};

const MilestoneCard = ({
  title,
  description,
  progress,
  progressColor,
  icon,
  iconBgClass
}: MilestoneCardProps) => {
  return (
    <div className="bg-slate-800 rounded-lg p-5 border border-slate-700 transition-transform hover:translate-y-[-2px]">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-full ${iconBgClass} flex items-center justify-center`}>
          {icon}
        </div>
        <div className="bg-slate-700 px-2 py-1 rounded-full">
          <span className="text-xs font-medium text-slate-300">{progress}%</span>
        </div>
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-slate-400 text-sm mb-4">{description}</p>
      <Progress value={progress} className="h-1" indicatorColor={progressColor} />
    </div>
  );
};

type MilestonesProps = {
  milestones: MilestoneWithProgress[];
};

export default function Milestones({ milestones }: MilestonesProps) {
  const getIconForMilestone = (iconName: string, className: string) => {
    switch (iconName) {
      case "globe":
        return <Globe className={className} />;
      case "zap":
        return <Zap className={className} />;
      case "users":
        return <Users className={className} />;
      case "award":
        return <Award className={className} />;
      default:
        return <Globe className={className} />;
    }
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Milestones</h2>
        <a href="#" className="text-sm text-purple-500 hover:text-purple-400">View All</a>
      </div>
      <p className="text-slate-400 text-sm mb-6">Track your social growth journey</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {milestones.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            title={milestone.title}
            description={milestone.description}
            progress={milestone.percentComplete}
            progressColor={milestone.progressColor}
            icon={getIconForMilestone(milestone.icon, "w-6 h-6")}
            iconBgClass={milestone.iconBgColor}
          />
        ))}
      </div>
    </div>
  );
}
