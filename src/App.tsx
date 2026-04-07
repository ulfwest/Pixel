import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { MousePointerClick, Info, ArrowRight, CheckCircle2, X, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type Block = {
  id: string;
  x: number; // 0-99
  y: number; // 0-99
  w: number; // width in blocks
  h: number; // height in blocks
  color: string;
  imageUrl?: string;
  link: string;
  title: string;
};

const GRID_SIZE = 100; // 100x100 blocks
const BLOCK_SIZE = 10; // Each block is 10x10 pixels

export default function App() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [popupBlock, setPopupBlock] = useState<Block | null>(null);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    color: '#00F0FF',
    imageUrl: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('pixelBlocks');
    if (saved) {
      try {
        setBlocks(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse blocks', e);
      }
    } else {
      // Add some dummy data
      const initialBlocks: Block[] = [
        { id: '1', x: 45, y: 45, w: 10, h: 10, color: '#00F0FF', title: 'Mittelstück', link: 'https://example.com' },
        { id: '2', x: 10, y: 10, w: 5, h: 5, color: '#FF00FF', title: 'Neon Pink', link: 'https://example.com' },
      ];
      setBlocks(initialBlocks);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pixelBlocks', JSON.stringify(blocks));
    drawGrid();
  }, [blocks, selectedCell]);

  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#050B14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#1A2332';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * BLOCK_SIZE, 0);
      ctx.lineTo(i * BLOCK_SIZE, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * BLOCK_SIZE);
      ctx.lineTo(canvas.width, i * BLOCK_SIZE);
      ctx.stroke();
    }

    // Draw blocks
    blocks.forEach((block) => {
      ctx.fillStyle = block.color;
      ctx.fillRect(block.x * BLOCK_SIZE, block.y * BLOCK_SIZE, block.w * BLOCK_SIZE, block.h * BLOCK_SIZE);
      
      // If we had images, we would draw them here
      // For now, just a colored block with a border
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(block.x * BLOCK_SIZE, block.y * BLOCK_SIZE, block.w * BLOCK_SIZE, block.h * BLOCK_SIZE);
    });

    // Draw selected cell highlight
    if (selectedCell) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.fillRect(selectedCell.x * BLOCK_SIZE, selectedCell.y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(selectedCell.x * BLOCK_SIZE, selectedCell.y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor(((e.clientX - rect.left) * scaleX) / BLOCK_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / BLOCK_SIZE);

    // Check if clicked on an existing block
    const clickedBlock = blocks.find(
      (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h
    );

    if (clickedBlock) {
      // Show popup for existing block
      setPopupBlock(clickedBlock);
      setSelectedCell(null);
      setIsSidebarOpen(false);
    } else {
      // Select empty cell
      setSelectedCell({ x, y });
      setIsSidebarOpen(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor(((e.clientX - rect.left) * scaleX) / BLOCK_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / BLOCK_SIZE);

    const hoveredBlock = blocks.find(
      (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h
    );

    if (hoveredBlock) {
      canvas.style.cursor = 'pointer';
      canvas.title = `${hoveredBlock.title}\n${hoveredBlock.link}`;
    } else {
      canvas.style.cursor = 'crosshair';
      canvas.title = `Leerer Block (${x}, ${y})`;
    }
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
  const handleResetZoom = () => setScale(1);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  const handlePaymentSuccess = () => {
    if (!selectedCell) return;

    const newBlock: Block = {
      id: Date.now().toString(),
      x: selectedCell.x,
      y: selectedCell.y,
      w: 1, // Default to 1x1 block for now
      h: 1,
      color: formData.color,
      title: formData.title || 'Mein Pixel',
      link: formData.link || 'https://',
      imageUrl: formData.imageUrl,
    };

    setBlocks([...blocks, newBlock]);
    setSelectedCell(null);
    setIsSidebarOpen(false);
    setFormData({ title: '', link: '', color: '#FF6321', imageUrl: '' });
  };

  const isFormValid = formData.title.trim() !== '' && formData.link.trim() !== '';

  return (
    <PayPalScriptProvider options={{ clientId: "test", currency: "EUR" }}>
    <div className="min-h-screen bg-[#050B14] text-white font-sans selection:bg-[#00F0FF] selection:text-black relative">
      {/* Pixel Background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 240, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          filter: 'drop-shadow(0 0 3px rgba(0, 240, 255, 0.5))'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050B14]/80 to-[#050B14]"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
      <header className="fixed top-0 w-full border-b border-white/10 bg-[#050B14]/80 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#00F0FF] rounded-sm shadow-[0_0_10px_rgba(0,240,255,0.5)]"></div>
            <span className="font-mono font-bold tracking-tight text-lg uppercase">PixelBlock</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-white/60">
            <a href="#about" className="hover:text-white transition-colors">So funktioniert's</a>
            <a href="#grid" className="hover:text-white transition-colors">Das Raster</a>
            <button className="px-4 py-2 bg-white text-black rounded-full hover:bg-[#00F0FF] hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all font-semibold">
              Wallet verbinden
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(0,240,255,0.15)_0%,_transparent_50%)]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono mb-6 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]"></span>
              {(1000000 - blocks.reduce((acc, b) => acc + (b.w * b.h * 100), 0)).toLocaleString('de-DE')} PIXEL VERFÜGBAR
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-6 uppercase">
              Besitze ein Stück <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00F0FF]/60">des Internets.</span>
            </h1>
            <p className="text-xl text-[#00F0FF] drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] mb-10 max-w-2xl mx-auto font-light">
              Kaufe Pixel, platziere deine Werbung und werde Teil der digitalen Geschichte. 
              Jeder Block ist 10x10 Pixel groß. Einmal gekauft, gehört er für immer dir.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a href="#grid" className="px-8 py-4 bg-[#00F0FF] text-black font-bold rounded-full hover:bg-white shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all flex items-center gap-2">
                Jetzt sichern <ArrowRight className="w-5 h-5" />
              </a>
              <a href="#about" className="px-8 py-4 border border-white/20 rounded-full hover:bg-white/5 hover:border-[#00F0FF]/50 transition-all font-medium">
                So funktioniert's
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Marquee */}
      <div className="py-8 overflow-hidden flex whitespace-nowrap">
        <motion.div 
          className="flex gap-6 items-center"
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.2)] uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]"></span>
            Verkaufte Pixel: {blocks.reduce((acc, b) => acc + (b.w * b.h * 100), 0).toLocaleString('de-DE')}
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.2)] uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]"></span>
            Verfügbare Pixel: {(1000000 - blocks.reduce((acc, b) => acc + (b.w * b.h * 100), 0)).toLocaleString('de-DE')}
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.2)] uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]"></span>
            Preis: 10 € pro Block (10x10)
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.2)] uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]"></span>
            Verkaufte Pixel: {blocks.reduce((acc, b) => acc + (b.w * b.h * 100), 0).toLocaleString('de-DE')}
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.2)] uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]"></span>
            Verfügbare Pixel: {(1000000 - blocks.reduce((acc, b) => acc + (b.w * b.h * 100), 0)).toLocaleString('de-DE')}
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.2)] uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]"></span>
            Preis: 10 € pro Block (10x10)
          </div>
        </motion.div>
      </div>

      {/* About Section */}
      <section id="about" className="py-24 px-6 border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-6 text-[#00F0FF] drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">So funktioniert's</h2>
              <div className="space-y-6 text-white/70">
                <p>
                  Das Raster besteht aus 1.000.000 Pixeln, angeordnet in 10.000 Blöcken zu je 10x10 Pixeln.
                </p>
                <p>
                  Du kannst jeden verfügbaren Block beanspruchen. Sobald er dir gehört, kannst du seine Farbe festlegen, einen Titel hinzufügen und ihn mit deiner Website, deinem Projekt oder Social Media verlinken. <strong>Du kannst sogar ein Bild hinzufügen, das als Popup erscheint, wenn jemand auf deinen Block klickt!</strong>
                </p>
                <p>
                  Dein Block bleibt für immer auf dem Raster. Es ist ein dauerhaftes Stück digitales Immobilien-Eigentum.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0A101A] border border-[#00F0FF]/20 p-6 rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-shadow">
                <div className="text-3xl font-bold text-[#00F0FF] mb-2 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">1M</div>
                <div className="text-sm text-white/50 uppercase tracking-wider font-mono">Pixel Gesamt</div>
              </div>
              <div className="bg-[#0A101A] border border-[#00F0FF]/20 p-6 rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-shadow">
                <div className="text-3xl font-bold text-[#00F0FF] mb-2 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">10x10</div>
                <div className="text-sm text-white/50 uppercase tracking-wider font-mono">Blockgröße</div>
              </div>
              <div className="bg-[#0A101A] border border-[#00F0FF]/20 p-6 rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-shadow">
                <div className="text-3xl font-bold text-[#00F0FF] mb-2 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">10 €</div>
                <div className="text-sm text-white/50 uppercase tracking-wider font-mono">Pro Block (10x10)</div>
              </div>
              <div className="bg-[#0A101A] border border-[#00F0FF]/20 p-6 rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-shadow">
                <div className="text-3xl font-bold text-[#00F0FF] mb-2 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">🖼️</div>
                <div className="text-sm text-white/50 uppercase tracking-wider font-mono">Bild-Popups</div>
              </div>
              <div className="bg-[#0A101A] border border-[#00F0FF]/20 p-6 rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-shadow col-span-2">
                <div className="text-3xl font-bold text-[#00F0FF] mb-2 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)] text-center">∞</div>
                <div className="text-sm text-white/50 uppercase tracking-wider font-mono text-center">Für immer</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Section */}
      <section id="grid" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-[#00F0FF] drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">Das Raster</h2>
            <div className="flex flex-col lg:flex-row items-end lg:items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.2)] uppercase">
                <MousePointerClick className="w-3.5 h-3.5" /> Klicke auf einen leeren Block, um ihn zu kaufen
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.2)] uppercase">
                <Info className="w-3.5 h-3.5" /> Klicke auf einen gefüllten Block, um ihn zu besuchen
              </div>
            </div>
          </div>

          <div className="relative border border-[#00F0FF]/30 rounded-xl overflow-hidden bg-[#0A101A] p-8 flex justify-center shadow-[0_0_40px_rgba(0,240,255,0.1)] group">
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={handleZoomIn} className="p-2 bg-[#050B14] border border-[#00F0FF]/30 rounded-lg text-[#00F0FF] hover:bg-[#00F0FF]/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all" title="Vergrößern (Strg + Mausrad)">
                <ZoomIn className="w-5 h-5" />
              </button>
              <button onClick={handleResetZoom} className="p-2 bg-[#050B14] border border-[#00F0FF]/30 rounded-lg text-[#00F0FF] hover:bg-[#00F0FF]/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all" title="Zoom zurücksetzen">
                <Maximize className="w-5 h-5" />
              </button>
              <button onClick={handleZoomOut} className="p-2 bg-[#050B14] border border-[#00F0FF]/30 rounded-lg text-[#00F0FF] hover:bg-[#00F0FF]/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all" title="Verkleinern (Strg + Mausrad)">
                <ZoomOut className="w-5 h-5" />
              </button>
            </div>

            <div 
              ref={containerRef}
              className="relative overflow-auto max-w-full max-h-[70vh] border border-[#1A2332] shadow-2xl cursor-crosshair rounded-sm"
              style={{ width: 'fit-content' }}
              onWheel={handleWheel}
            >
              <canvas
                ref={canvasRef}
                width={GRID_SIZE * BLOCK_SIZE}
                height={GRID_SIZE * BLOCK_SIZE}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                className="block bg-[#050B14] transition-transform duration-200 origin-top-left"
                style={{ 
                  width: GRID_SIZE * BLOCK_SIZE * scale, 
                  height: GRID_SIZE * BLOCK_SIZE * scale,
                  imageRendering: 'pixelated'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sidebar for Buying */}
      {isSidebarOpen && selectedCell && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="fixed top-0 right-0 w-full md:w-[400px] h-full bg-[#0A101A] border-l border-[#00F0FF]/20 z-50 p-6 shadow-[-20px_0_50px_rgba(0,240,255,0.1)] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Block sichern</h3>
            <button 
              onClick={() => {
                setIsSidebarOpen(false);
                setSelectedCell(null);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10 font-mono text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-white/50">Position</span>
              <span>X: {selectedCell.x}, Y: {selectedCell.y}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-white/50">Größe</span>
              <span>10x10 Pixel</span>
            </div>
            <div className="flex justify-between text-[#00F0FF] drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">
              <span>Preis</span>
              <span>10,00 €</span>
            </div>
          </div>

          <form className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Werbetitel</label>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-[#050B14] border border-[#00F0FF]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00F0FF] focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all"
                placeholder="Mein tolles Projekt"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Ziel-URL</label>
              <input 
                type="url" 
                required
                value={formData.link}
                onChange={(e) => setFormData({...formData, link: e.target.value})}
                className="w-full bg-[#050B14] border border-[#00F0FF]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00F0FF] focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all"
                placeholder="https://"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Bild-URL (Optional)</label>
              <input 
                type="url" 
                value={formData.imageUrl}
                onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                className="w-full bg-[#050B14] border border-[#00F0FF]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00F0FF] focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all"
                placeholder="https://example.com/image.png"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Blockfarbe</label>
              <div className="flex gap-4">
                <input 
                  type="color" 
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <input 
                  type="text" 
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="flex-1 bg-[#050B14] border border-[#00F0FF]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00F0FF] focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-mono"
                />
              </div>
            </div>

            <div className="mt-8">
              {!isFormValid && (
                <p className="text-sm text-red-400 mb-4">Bitte fülle Werbetitel und Ziel-URL aus, um fortzufahren.</p>
              )}
              <div className={!isFormValid ? "opacity-50 pointer-events-none" : ""}>
                <PayPalButtons 
                  style={{ layout: "vertical", color: "blue" }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      intent: "CAPTURE",
                      purchase_units: [
                        {
                          description: `PixelBlock: ${formData.title}`,
                          amount: {
                            currency_code: "EUR",
                            value: "10.00",
                          },
                        },
                      ],
                    });
                  }}
                  onApprove={async (data, actions) => {
                    if (actions.order) {
                      await actions.order.capture();
                      handlePaymentSuccess();
                    }
                  }}
                />
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#00F0FF]/20 py-12 px-6 mt-20 bg-[#0A101A]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#00F0FF] rounded-sm shadow-[0_0_10px_rgba(0,240,255,0.5)]"></div>
            <span className="font-mono font-bold tracking-tight uppercase">PixelBlock</span>
          </div>
          <p className="text-white/40 text-sm">© 2026 PixelBlock. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
      </div>

      {/* Popup for Existing Block */}
      {popupBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPopupBlock(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0A101A] border border-[#00F0FF]/30 rounded-xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(0,240,255,0.15)] relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setPopupBlock(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-[#00F0FF] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-bold text-white mb-4 pr-8">{popupBlock.title}</h3>
            
            <div className="aspect-video w-full rounded-lg mb-6 overflow-hidden bg-[#050B14] border border-white/10 flex items-center justify-center relative group">
              {popupBlock.imageUrl ? (
                <img src={popupBlock.imageUrl} alt={popupBlock.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div 
                  className="w-full h-full opacity-50" 
                  style={{ backgroundColor: popupBlock.color }}
                ></div>
              )}
              <a 
                href={popupBlock.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <span className="px-6 py-3 bg-[#00F0FF] text-black font-bold rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.5)]">
                  Besuchen <ArrowRight className="w-4 h-4" />
                </span>
              </a>
            </div>
            
            <div className="flex items-center justify-between text-sm font-mono text-white/50">
              <span>Block: {popupBlock.x}, {popupBlock.y}</span>
              <div className="flex items-center gap-2">
                <span>Farbe:</span>
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: popupBlock.color }}></div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    </PayPalScriptProvider>
  );
}
