import React from 'react';

/**
 * ReWeara Design System & Style Guide
 * Demonstrates responsive layouts (mobile-first), luxury feminine typography,
 * color palette implementation, and interactive button transitions.
 */
export default function StyleGuide() {
  const brandColors = [
    { name: 'Alabaster Cream', hex: '#FCF9F6', role: 'Base page background, warm luxury look', text: 'text-brand-espresso' },
    { name: 'Muted Blush', hex: '#E8C5C8', role: 'Primary brand accent, soft feminine rose', text: 'text-brand-espresso' },
    { name: 'Champagne Gold', hex: '#D4AF37', role: 'Secondary metallic accents, borders, high-end highlights', text: 'text-white' },
    { name: 'Warm Espresso', hex: '#2B2321', role: 'Primary text color, replaces harsh pure black', text: 'text-white' },
    { name: 'Dusty Charcoal', hex: '#8E7E7A', role: 'Subtitles, borders, secondary text descriptions', text: 'text-white' },
    { name: 'Soft Sage', hex: '#C8D6C5', role: 'Success states, badges, alternative rental options', text: 'text-brand-espresso' }
  ];

  const sampleOutfit = {
    title: 'Royal Ivory Zardozi Lehenga',
    description: 'Exquisite hand-woven raw silk lehenga with vintage zardozi golden embroidery.',
    category: 'Lehenga',
    rentPrice: 5000,
    refundableDeposit: 8000,
    thumbnail: '/premium_lehenga_rental.png',
    status: 'available'
  };

  return (
    <div className="min-h-screen bg-brand-cream text-brand-espresso p-4 sm:p-6 md:p-12 animate-fade-in">
      {/* Editorial Header */}
      <header className="max-w-6xl mx-auto border-b border-brand-dust/20 pb-8 mb-12 text-center md:text-left">
        <span className="text-xs uppercase tracking-[0.25em] text-brand-dust font-semibold">Design System & Brand Assets</span>
        <h1 className="text-4xl md:text-6xl font-serif mt-2 mb-4 tracking-tight">ReWeara</h1>
        <p className="text-sm md:text-base text-brand-dust max-w-xl font-light leading-relaxed">
          A premium, Pinterest-inspired rental boutique style system. Focused on breathing room, soft tones, and mobile-first responsiveness.
        </p>
      </header>

      <main className="max-w-6xl mx-auto space-y-16">
        
        {/* Section 1: Color Palette */}
        <section className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-serif border-b border-brand-dust/10 pb-2">1. The Color Palette</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {brandColors.map((color) => (
              <div 
                key={color.hex} 
                className="bg-white rounded-luxury border border-brand-dust/15 overflow-hidden shadow-sm transition-transform duration-300 hover:scale-[1.01]"
              >
                <div 
                  className="h-32 flex items-end p-4" 
                  style={{ backgroundColor: color.hex }}
                >
                  <span className={`text-xs font-mono bg-white/95 px-2 py-1 rounded shadow-sm text-brand-espresso font-semibold`}>
                    {color.hex}
                  </span>
                </div>
                <div className="p-4 space-y-1">
                  <h3 className="font-serif font-medium text-lg">{color.name}</h3>
                  <p className="text-xs text-brand-dust leading-normal">{color.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Typography */}
        <section className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-serif border-b border-brand-dust/10 pb-2">2. Typography Hierarchy</h2>
          <div className="space-y-8 bg-white p-6 md:p-8 rounded-luxury border border-brand-dust/15">
            <div className="space-y-4">
              <span className="text-xs font-mono text-brand-dust uppercase tracking-wider block">Heading (Playfair Display - Serif)</span>
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif leading-none tracking-tight">
                  Display Title (Responsive)
                </h1>
                <p className="text-xs text-brand-dust font-mono">
                  Scale: text-3xl (mobile) → sm:text-4xl → md:text-5xl → lg:text-6xl (large screens)
                </p>
              </div>
              <div className="border-t border-brand-dust/10 pt-4 mt-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-serif">Section Headings</h2>
                <p className="text-xs text-brand-dust font-mono mt-1">Scale: text-xl (mobile) → sm:text-2xl → md:text-3xl</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-brand-dust/10 pt-6">
              <span className="text-xs font-mono text-brand-dust uppercase tracking-wider block">Body Text (Outfit - Sans-Serif)</span>
              <p className="text-base font-light leading-relaxed max-w-2xl">
                This is our body text using <strong>Outfit</strong>. It offers clean, geometric modern letterforms that remain highly readable on mobile viewports. We prioritize thin and light weights (300/400) for a clean editorial design language that mimics high-end fashion boutiques.
              </p>
              <p className="text-sm text-brand-dust font-light leading-relaxed">
                Small caption: Used for footnotes, technical deposits details, and secondary metrics metadata.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Interactive Buttons */}
        <section className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-serif border-b border-brand-dust/10 pb-2">3. Button components</h2>
          <div className="bg-white p-6 md:p-8 rounded-luxury border border-brand-dust/15 space-y-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Primary Premium Button */}
              <button className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-6 py-3 rounded-soft text-sm uppercase tracking-widest font-medium transition-all duration-300 hover:shadow-md transform hover:-translate-y-[1px]">
                Rent Now (Primary)
              </button>

              {/* Secondary Accent Button */}
              <button className="bg-brand-blush text-brand-espresso hover:opacity-90 px-6 py-3 rounded-soft text-sm uppercase tracking-widest font-medium transition-all duration-300 transform hover:-translate-y-[1px]">
                Add to Cart
              </button>

              {/* Outlined Button */}
              <button className="border border-brand-espresso text-brand-espresso hover:bg-brand-espresso/5 px-6 py-3 rounded-soft text-sm uppercase tracking-widest font-medium transition-all duration-300">
                Check Dates
              </button>

              {/* Minimal Text Link Button */}
              <button className="text-brand-espresso hover:text-brand-dust py-2 px-3 text-xs uppercase tracking-[0.2em] font-semibold transition-all duration-300 border-b border-brand-espresso hover:border-brand-dust">
                Learn More
              </button>
            </div>
            <p className="text-xs text-brand-dust font-mono">
              Hover states utilize smooth CSS transforms (`translate-y-[1px]`), custom duration parameters, and soft shadow changes to provide immediate micro-interactions.
            </p>
          </div>
        </section>

        {/* Section 4 & 5: Sample Card & Responsive Grid */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-brand-dust/10 pb-2">
            <h2 className="text-2xl md:text-3xl font-serif">4 & 5. Outfit Card & Responsive Grid</h2>
            <span className="text-xs font-mono text-brand-dust">Grid Scale: 2 columns (mobile) → 3 cols (tablet) → 4 cols (desktop)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            
            {/* Displaying multiple sample cards to demonstrate responsive grid alignment */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <article 
                key={item}
                className="group flex flex-col bg-white rounded-luxury border border-brand-dust/15 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Image Block */}
                <div className="relative aspect-square bg-brand-cream overflow-hidden">
                  <img 
                    src={sampleOutfit.thumbnail} 
                    alt={sampleOutfit.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute top-4 left-4 text-[10px] uppercase tracking-widest bg-brand-cream/95 text-brand-espresso px-2.5 py-1.5 rounded shadow-sm font-semibold border border-brand-dust/10">
                    {sampleOutfit.category}
                  </span>
                </div>

                {/* Details Block */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-serif text-sm sm:text-base tracking-tight leading-snug group-hover:text-brand-dust transition-colors duration-300">
                      {sampleOutfit.title} {item > 1 && `#${item}`}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-brand-dust font-light leading-relaxed line-clamp-2">
                      {sampleOutfit.description}
                    </p>
                  </div>

                  {/* Financials & Action */}
                  <div className="space-y-3 pt-2 border-t border-brand-cream">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1.5 sm:gap-0">
                      <div>
                        <span className="text-[10px] text-brand-dust uppercase tracking-wider block">Rental Price</span>
                        <span className="text-sm sm:text-base font-semibold text-brand-espresso">₹{sampleOutfit.rentPrice.toLocaleString('en-IN')}<span className="text-[10px] font-light text-brand-dust"> / day</span></span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-brand-dust uppercase tracking-wider block">Deposit (Refundable)</span>
                        <span className="text-xs sm:text-sm font-medium text-brand-espresso">₹{sampleOutfit.refundableDeposit.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <button className="w-full bg-brand-espresso text-brand-cream hover:bg-brand-dust py-2 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300">
                      Reserve Outfit
                    </button>
                  </div>
                </div>
              </article>
            ))}

          </div>
        </section>

      </main>

      {/* Styled Footer */}
      <footer className="max-w-6xl mx-auto border-t border-brand-dust/10 mt-16 pt-8 text-center text-xs text-brand-dust">
        <p>© 2026 ReWeara Design System. Crafted for high-end boutique performance.</p>
      </footer>
    </div>
  );
}
