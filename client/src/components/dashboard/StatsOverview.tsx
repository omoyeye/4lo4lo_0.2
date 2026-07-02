import { motion } from 'framer-motion';
import { 
  PlusCircle, 
  CheckCircle, 
  Star, 
  HelpCircle 
} from "lucide-react";

type StatsOverviewProps = {
  availableTasks: number;
  completedTasks: number;
  totalPoints: number;
  dailyPoints: number;
  globalRank: string;
};

export default function StatsOverview({
  availableTasks,
  completedTasks,
  totalPoints,
  dailyPoints,
  globalRank
}: StatsOverviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Available Tasks */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="bg-slate-800 rounded-lg p-6 shadow-md transition-transform hover:translate-y-[-2px]"> {/* Added p-6 and shadow-md */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-medium text-slate-400">Available Tasks</h3>
          <div className="w-6 h-6 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center">
            <PlusCircle className="w-4 h-4 text-blue-400" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{availableTasks}</p>
            <p className="text-xs text-green-400">{availableTasks > 0 ? `${availableTasks} updated daily` : "0 updated daily"}</p>
          </div>
        </div>
      </motion.div>

      {/* Completed Tasks */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 0.1 }}
        className="bg-slate-800 rounded-lg p-6 shadow-md transition-transform hover:translate-y-[-2px]"> {/* Added p-6 and shadow-md */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-medium text-slate-400">Completed Tasks</h3>
          <div className="w-6 h-6 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{completedTasks}</p>
            <p className="text-xs text-green-400">{completedTasks > 0 ? `${completedTasks} new going` : "0 new going"}</p>
          </div>
        </div>
      </motion.div>

      {/* Total Points */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 0.2 }}
        className="bg-slate-800 rounded-lg p-6 shadow-md transition-transform hover:translate-y-[-2px]"> {/* Added p-6 and shadow-md */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-medium text-slate-400">Total Points</h3>
          <div className="w-6 h-6 rounded-full bg-yellow-500 bg-opacity-20 flex items-center justify-center">
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{totalPoints}</p>
            <p className="text-xs text-green-400">{dailyPoints > 0 ? `${dailyPoints} earn more daily` : "0 earn more daily"}</p>
          </div>
        </div>
      </motion.div>

      {/* Global Rank */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 0.3 }}
        className="bg-slate-800 rounded-lg p-6 shadow-md transition-transform hover:translate-y-[-2px]"> {/* Added p-6 and shadow-md */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-medium text-slate-400">Global Rank</h3>
          <div className="w-6 h-6 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-purple-400" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{globalRank || "-"}</p>
            <p className="text-xs text-green-400">• Top 10%</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}