import React from 'react';
import { Search, MessageCircle, UserX } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from './ui/card';

export const EducationalSection: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } }
  };

  return (
    <section className="py-16 sm:py-24 bg-background transition-colors">
      <div className="container mx-auto px-4">
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-50px" }} 
          variants={containerVariants} 
          className="text-center mb-12 sm:mb-16"
        >
          <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Understanding Twitter Bans
          </motion.h2>
          <motion.p variants={itemVariants} className="text-muted-foreground mt-3 text-lg max-w-2xl mx-auto">
            What do these results actually mean for your account?
          </motion.p>
        </motion.div>

        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-50px" }} 
          variants={containerVariants} 
          className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto"
        >
          <motion.div variants={itemVariants} className="h-full">
            <Card className="p-6 sm:p-8 h-full bg-card hover:bg-muted/10 transition-colors border-border/50 hover:border-border cursor-default group">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-5 text-blue-500 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Search Suggestion Ban</h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                Your account doesn't appear in the search bar's auto-complete dropdown. Often the first sign of a penalty.
              </p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="h-full">
            <Card className="p-6 sm:p-8 h-full bg-card hover:bg-muted/10 transition-colors border-border/50 hover:border-border cursor-default group">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-5 text-purple-500 group-hover:scale-110 transition-transform">
                <UserX className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Search Ban</h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                Your tweets are completely hidden from search results, even when searching for exact phrases. A severe visibility penalty.
              </p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="h-full">
            <Card className="p-6 sm:p-8 h-full bg-card hover:bg-muted/10 transition-colors border-border/50 hover:border-border cursor-default group">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-5 text-orange-500 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Ghost Ban</h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                Also known as Reply Deboosting. Your replies are hidden behind a "Show more" button or made invisible to others.
              </p>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
