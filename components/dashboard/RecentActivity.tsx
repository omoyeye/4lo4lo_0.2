"use client";

import { UserTask, Task, User } from "@shared/schema";

type RecentTasksProps = {
  recentTasks: (UserTask & { task: Task })[];
};

type TopEarnersProps = {
  topEarners: User[];
};

export function RecentTasks({ recentTasks }: RecentTasksProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Recent Tasks</h2>
      <p className="text-slate-400 text-sm mb-4">Your latest mobile engagement activities</p>
      
      {recentTasks.length > 0 ? (
        <div className="bg-slate-800 rounded-lg divide-y divide-slate-700">
          {recentTasks.map((userTask) => (
            <div key={userTask.id} className="p-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-medium">{userTask.task.title}</h3>
                  <p className="text-sm text-slate-400">{userTask.task.platform}</p>
                </div>
                <div className="text-green-400 font-medium">+{userTask.task.points} pts</div>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(userTask.completedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-6 flex items-center justify-center text-center min-h-[100px]">
          <p className="text-slate-400">No recent tasks found. Start completing tasks to see them here!</p>
        </div>
      )}
    </div>
  );
}

export function TopEarners({ topEarners }: TopEarnersProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Top Earners</h2>
      
      {topEarners.length > 0 ? (
        <div className="bg-slate-800 rounded-lg divide-y divide-slate-700">
          {topEarners.map((user, index) => (
            <div key={user.id} className="p-4 flex items-center">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs mr-3">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{user.username}</h3>
                <p className="text-sm text-slate-400">Level {user.level}</p>
              </div>
              <div className="text-yellow-400 font-medium">{user.points} pts</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-6 flex items-center justify-center text-center min-h-[100px]">
          <p className="text-slate-400">Complete tasks to appear on the leaderboard!</p>
        </div>
      )}
    </div>
  );
}

type RecentActivityProps = {
  recentTasks: (UserTask & { task: Task })[];
  topEarners: User[];
};

export default function RecentActivity({ recentTasks, topEarners }: RecentActivityProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <RecentTasks recentTasks={recentTasks} />
      <TopEarners topEarners={topEarners} />
    </div>
  );
}
