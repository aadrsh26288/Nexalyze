"use client";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { useRouter } from 'next/navigation'
import { useAuth } from "@clerk/nextjs";

export default function HomePage() {
    const router = useRouter()
    const { isSignedIn } = useAuth();
  return (
  <div>
     <div  className="flex flex-col items-center justify-center mt-20"> 
     <motion.h2 
      initial={{ opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0,transition: { duration: 0.5 } }}
      exit={{ opacity: 0, y: 20 }}
     className="text-4xl font-bold"> Ship Sites Like a Pro.</motion.h2>
     <motion.p
      initial={{opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      exit={{ opacity: 0, y: 20 }}
     
     className="text-md mt-2 w-1/2 text-center">Test, audit, and improve your portfolio using performance data and AI-driven insights that actually make sense.</motion.p>
     <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4  }}
      exit={{ opacity: 0, y: 20 }}
     >
     <Button onClick={()=>{router.push(isSignedIn?'/analysis':'/sign-up')}} className="mt-4 cursor-pointer bg-white text-black">Get Started</Button>
     </motion.div>
     </div>
  </div>
  );
}
