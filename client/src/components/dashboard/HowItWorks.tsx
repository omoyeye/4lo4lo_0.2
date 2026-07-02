import { 
  Check, 
  Award, 
  CheckCircle2
} from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="bg-slate-800 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-6">How It Works</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1 */}
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-4">
            <span className="text-white font-medium">1</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Choose Tasks</h3>
            <p className="text-slate-400 text-sm">Select from various social media engagement tasks across different platforms</p>
          </div>
        </div>
        
        {/* Step 2 */}
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-4">
            <span className="text-white font-medium">2</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Complete Tasks</h3>
            <p className="text-slate-400 text-sm">Follow, like, or engage with content to complete tasks and earn points</p>
          </div>
        </div>
        
        {/* Step 3 */}
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-4">
            <span className="text-white font-medium">3</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Earn Rewards</h3>
            <p className="text-slate-400 text-sm">Get points for each completed task and unlock special rewards</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-center text-sm text-slate-400">
        <p>Complete more tasks to level up and unlock additional rewards!</p>
      </div>
    </div>
  );
}
