import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ComprehensiveAnalysisSection from '@/components/sections/ComprehensiveAnalysisSection';

export default function ComprehensiveAnalysisPage() {
  return (
    <main className="relative min-h-screen bg-black">
      <Navbar />
      <div className="pt-24" />
      <ComprehensiveAnalysisSection />
      <Footer />
    </main>
  );
}
