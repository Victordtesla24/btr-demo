import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import WorkSection from '@/components/sections/WorkSection';

export default function BirthChartPage() {
  return (
    <main className="relative min-h-screen bg-black">
      <Navbar />
      <div className="pt-24" />
      <WorkSection />
      <Footer />
    </main>
  );
}
