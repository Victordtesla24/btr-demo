import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BTRSection from '@/components/sections/BTRSection';

export default function BirthTimeRectificationPage() {
  return (
    <main className="relative min-h-screen bg-black">
      <Navbar />
      <div className="pt-24" />
      <BTRSection />
      <Footer />
    </main>
  );
}
