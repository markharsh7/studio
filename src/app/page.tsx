'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { PenTool, ArrowRight, Landmark, Building, BookOpen, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Header component for the landing page
function LandingHeader() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Image 
            src="/images/logo.svg"
            alt="logo"
            width={32}
            height={32}
            className="text-accent"
          />
          <span className="font-bold sm:inline-block font-lora text-lg">
            NYAI <span className="text-accent font-lora">भारत</span>
          </span>
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
        
        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-4 text-sm lg:gap-6">
          {user ? (
            <>
              <Button size="sm" asChild>
                <Link href="/assistant">Go to Assistant</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={signInWithGoogle}>
              Sign In
            </Button>
          )}
          
          <Button variant="outline" size="sm" className="border-accent text-accent hover:bg-accent/10">
            सत्यमेव जयते
          </Button>
        </nav>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background border-b">
          <div className="flex flex-col p-4 space-y-4">
            <div className="flex flex-col space-y-2 pt-2">
              {user ? (
                <>
                  <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href="/assistant" onClick={() => setMobileMenuOpen(false)}>Go to Assistant</Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { signOut(); setMobileMenuOpen(false); }}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => { signInWithGoogle(); setMobileMenuOpen(false); }}>
                  Sign In
                </Button>
              )}
              
              <Button variant="outline" size="sm" className="border-accent text-accent hover:bg-accent/10">
                सत्यमेव जयते
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default function LandingPage() {
  const { startDemo, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  
  const handleTryDemo = () => {
    if (!user) {
      startDemo();
    }
    router.push('/assistant');
  };
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />
      <main className="flex-1">
        <section className="container px-4 md:px-6 py-12 md:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter font-lora text-primary">
                The Precedent Research Platform For Indian Legal Professionals
              </h1>
              <p className="text-base md:text-lg text-foreground/80">
                Powered by NYAI. Access landmark judgments from the Supreme Court of India and High Courts. Find relevant case precedents with advanced AI and Indian legal knowledge.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
                  onClick={handleTryDemo}
                >
                  Try NYAI Demo <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-primary hover:bg-secondary text-primary w-full sm:w-auto"
                  onClick={signInWithGoogle}
                >
                  Get Started
                </Button>
              </div>
              <div className="pt-6 text-sm text-foreground/60">
                <p></p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-accent" />
                    <span>National law University</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-accent" />
                    <span>DELHI HIGH COURT</span>
                  </div>
                </div>
              </div>
            </div>
            <Card className="p-8 bg-card shadow-xl rounded-xl flex flex-col items-center justify-center space-y-6 min-h-[300px] md:min-h-[400px] mt-8 lg:mt-0">
              <Image 
                src="/images/logo.svg"
                alt="logo"
                width={80}
                height={80}
                className="text-primary ml-1"
              />
              <h2 className="text-3xl font-bold text-center font-lora text-primary">NYAI</h2>
              <p className="text-center text-foreground/80">
                A modern legal research platform
              </p>
              <div className="flex items-center space-x-4 pt-6">
                <BookOpen className="h-8 w-8 text-accent"/>
                <span className="font-medium text-accent font-lora text-lg">सत्यमेव जयते</span>
                <BookOpen className="h-8 w-8 text-accent"/>
              </div>
            </Card>
          </div>
        </section>
      </main>
      <footer className="py-8 border-t">
        <div className="container text-center text-sm text-foreground/60">
          © {new Date().getFullYear()} NYAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}