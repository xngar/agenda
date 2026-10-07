import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import Specialties from "@/components/landing/specialties";
import Problem from "@/components/landing/problem";
import Features from "@/components/landing/features";
import HowItWorks from "@/components/landing/how-it-works";
import Security from "@/components/landing/security";
import Pricing from "@/components/landing/pricing";
import Faq from "@/components/landing/faq";
import DemoForm from "@/components/landing/demo-form";
import Footer from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Specialties />
        <Problem />
        <Features />
        <HowItWorks />
        <Security />
        <Pricing />
        <Faq />
        <DemoForm />
      </main>
      <Footer />
    </>
  );
}
