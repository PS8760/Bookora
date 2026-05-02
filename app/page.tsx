import Link from "next/link";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ServicesSection from "@/components/landing/ServicesSection";
import FeaturedServices from "@/components/landing/FeaturedServices";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTASection from "@/components/landing/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ServicesSection />
      <FeaturedServices />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
