import { FinalCta, Footer } from "@/components/landing/cta-footer";
import { Features } from "@/components/landing/features";
import { ForEmployees } from "@/components/landing/for-employees";
import { ForHr } from "@/components/landing/for-hr";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingNav } from "@/components/landing/nav";
import { PrivacyBand } from "@/components/landing/privacy-band";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main className="overflow-x-clip">
        <Hero />
        <Features />
        <HowItWorks />
        <ForHr />
        <ForEmployees />
        <PrivacyBand />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
