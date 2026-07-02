import { motion } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";

export default function MobileHeader() {
  return (
    <motion.header
      className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-9 h-9 flex items-center justify-center shadow-md rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-purple-600/20"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).classList.remove('hidden');
                }
              }}
            />
            <div className="hidden w-full h-full flex items-center justify-center">
              <img 
                src="/4lo4lo-logo.png" 
                alt="4lo4lo Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </motion.div>
          <span className="font-bold text-lg bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            4LO4LO
          </span>
        </div>
        
        <NotificationBell />
      </div>
    </motion.header>
  );
}
