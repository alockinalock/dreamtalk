import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroNetwork from "../assets/hero-network.jpg";

const Index = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/mindmap");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <img
        src={heroNetwork}
        alt="Network visualization"
        className="absolute inset-0 h-full w-full object-cover opacity-100"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        {/* Tagline */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 backdrop-blur-sm px-4 py-2 text-sm animate-fade-in shadow-[0_0_20px_rgba(168,85,247,0.5)]">
          <Sparkles className="h-4 w-4 text-primary animate-pulse-slow" />
          <span className="text-foreground font-medium">
            Transform conversations into knowledge
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground lg:text-7xl animate-fade-in drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
            dreamtalk
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mb-10 max-w-2xl text-xl text-foreground/90 lg:text-2xl animate-fade-in drop-shadow-lg">
          Watch your ideas come alive. Record conversations and see a live node map evolve in real time as you speak.
        </p>

        {/* Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in">
          <Button
            size="lg"
            onClick={handleGetStarted}
            className="gap-2 bg-gradient-to-r from-blue-500 to-primary hover:from-primary/90 hover:to-blue-500/90 shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:shadow-[0_0_40px_rgba(168,85,247,0.8)] transition-all border-0"
          >
            <Zap className="h-5 w-5" />
            Get Started
          </Button>

          <a href="https://github.com/alockinalock/dreamtalk">
            <Button
              size="lg"
              className="gap-2 bg-gradient-to-l from-pink-500 to-primary hover:from-primary/90 hover:to-pink-500/90 shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:shadow-[0_0_40px_rgba(168,85,247,0.8)] transition-all border-0"
            >
              <MessageCircle className="h-5 w-5" />
              See How It Works
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Index;
