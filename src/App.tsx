import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion } from 'motion/react';
import { MousePointerClick, Info, ArrowRight, CheckCircle2, X, ZoomIn, ZoomOut, Maximize, Plus, Minus, Volume2, VolumeX, Share2 } from 'lucide-react';

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
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [popupBlock, setPopupBlock] = useState<Block | null>(null);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isImpressumOpen, setIsImpressumOpen] = useState(false);
  const [isDatenschutzOpen, setIsDatenschutzOpen] = useState(false);
  const [resizeError, setResizeError] = useState<string | null>(null);
  const [formResizeError, setFormResizeError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number, y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);
  const isDraggingRef = useRef(false);

  const [hasClickedDonate, setHasClickedDonate] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomIntentRef = useRef<{ scale: number, x: number, y: number, oldScale: number } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    color: '#00F0FF',
    imageUrl: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('pixelBlocks_v4');
    if (saved) {
      try {
        setBlocks(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse blocks', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pixelBlocks_v4', JSON.stringify(blocks));
    drawGrid();
  }, [blocks, selectedCell, draggingBlockId, dragPos]);

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
      if (block.id === draggingBlockId && dragPos) {
        let overlap = false;
        if (dragPos.x < 0 || dragPos.y < 0 || dragPos.x + block.w > GRID_SIZE || dragPos.y + block.h > GRID_SIZE) overlap = true;
        else {
          for (const b of blocks) {
            if (b.id === block.id) continue;
            if (!(dragPos.x + block.w <= b.x || dragPos.x >= b.x + b.w || dragPos.y + block.h <= b.y || dragPos.y >= b.y + b.h)) {
              overlap = true;
              break;
            }
          }
        }
        
        ctx.fillStyle = block.color;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(dragPos.x * BLOCK_SIZE, dragPos.y * BLOCK_SIZE, block.w * BLOCK_SIZE, block.h * BLOCK_SIZE);
        
        ctx.strokeStyle = overlap ? 'red' : '#00F0FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(dragPos.x * BLOCK_SIZE, dragPos.y * BLOCK_SIZE, block.w * BLOCK_SIZE, block.h * BLOCK_SIZE);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x * BLOCK_SIZE, block.y * BLOCK_SIZE, block.w * BLOCK_SIZE, block.h * BLOCK_SIZE);
        
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(block.x * BLOCK_SIZE, block.y * BLOCK_SIZE, block.w * BLOCK_SIZE, block.h * BLOCK_SIZE);
      }
    });

    // Draw selected cell highlight
    if (selectedCell) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.fillRect(selectedCell.x * BLOCK_SIZE, selectedCell.y * BLOCK_SIZE, selectedCell.w * BLOCK_SIZE, selectedCell.h * BLOCK_SIZE);
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(selectedCell.x * BLOCK_SIZE, selectedCell.y * BLOCK_SIZE, selectedCell.w * BLOCK_SIZE, selectedCell.h * BLOCK_SIZE);
    }
  };

  const getGridCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / BLOCK_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / BLOCK_SIZE);
    return { x, y };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGridCoords(e);
    if (!coords) return;
    const { x, y } = coords;

    const clickedBlock = blocks.find(
      (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h
    );

    if (clickedBlock) {
      setDraggingBlockId(clickedBlock.id);
      setDragOffset({ x: x - clickedBlock.x, y: y - clickedBlock.y });
      setDragPos({ x: clickedBlock.x, y: clickedBlock.y });
    }
    isDraggingRef.current = false;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGridCoords(e);
    if (!coords) return;
    const { x, y } = coords;

    if (draggingBlockId && dragOffset) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;
      if (!dragPos || newX !== dragPos.x || newY !== dragPos.y) {
        setDragPos({ x: newX, y: newY });
        isDraggingRef.current = true;
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const hoveredBlock = blocks.find(
      (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h
    );

    if (draggingBlockId) {
       canvas.style.cursor = 'grabbing';
    } else if (hoveredBlock) {
      canvas.style.cursor = 'grab';
      canvas.title = `${hoveredBlock.title}\n${hoveredBlock.link}`;
    } else {
      canvas.style.cursor = 'crosshair';
      canvas.title = `Leerer Block (${x}, ${y})`;
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingBlockId && dragPos && isDraggingRef.current) {
      const block = blocks.find(b => b.id === draggingBlockId);
      if (block && canResize(block.id, dragPos.x, dragPos.y, block.w, block.h)) {
        const updatedBlocks = blocks.map(b => 
          b.id === draggingBlockId ? { ...b, x: dragPos.x, y: dragPos.y } : b
        );
        setBlocks(updatedBlocks);
      }
    }
    
    setDraggingBlockId(null);
    setDragPos(null);
    setDragOffset(null);
    
    if (isDraggingRef.current) {
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 0);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      return;
    }

    const coords = getGridCoords(e);
    if (!coords) return;
    const { x, y } = coords;

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
      setSelectedCell({ x, y, w: 1, h: 1 });
      setIsSidebarOpen(true);
      setHasClickedDonate(false);
    }
  };

  const applyZoom = (newScale: number, clientX?: number, clientY?: number) => {
    const container = containerRef.current;
    if (!container) return;

    const oldScale = scale;
    if (oldScale === newScale) return;

    let targetX, targetY;
    if (clientX !== undefined && clientY !== undefined) {
      const rect = container.getBoundingClientRect();
      targetX = clientX - rect.left;
      targetY = clientY - rect.top;
    } else {
      targetX = container.clientWidth / 2;
      targetY = container.clientHeight / 2;
    }

    zoomIntentRef.current = { scale: newScale, x: targetX, y: targetY, oldScale };
    setScale(newScale);
  };

  const handleZoomIn = () => applyZoom(Math.min(scale + 0.5, 5));
  const handleZoomOut = () => applyZoom(Math.max(scale - 0.5, 0.5));
  const handleResetZoom = () => applyZoom(1);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const newScale = e.deltaY < 0 ? Math.min(scale + 0.5, 5) : Math.max(scale - 0.5, 0.5);
      applyZoom(newScale, e.clientX, e.clientY);
    }
  };

  useLayoutEffect(() => {
    if (zoomIntentRef.current) {
      const container = containerRef.current;
      if (container) {
        const { scale: newScale, x, y, oldScale } = zoomIntentRef.current;
        
        const scrollX = container.scrollLeft;
        const scrollY = container.scrollTop;

        // point in unscaled coordinates
        const unscaledX = (scrollX + x) / oldScale;
        const unscaledY = (scrollY + y) / oldScale;

        // new scaled coordinates
        const newScrollX = unscaledX * newScale - x;
        const newScrollY = unscaledY * newScale - y;

        container.scrollLeft = newScrollX;
        container.scrollTop = newScrollY;
      }
      zoomIntentRef.current = null;
    }
  }, [scale]);

  const canResize = (currentBlockId: string | null, newX: number, newY: number, newW: number, newH: number) => {
    if (newX < 0 || newY < 0 || newX + newW > GRID_SIZE || newY + newH > GRID_SIZE) {
      return false;
    }
    for (const b of blocks) {
      if (currentBlockId && b.id === currentBlockId) continue;
      const overlap = !(
        newX + newW <= b.x ||
        newX >= b.x + b.w ||
        newY + newH <= b.y ||
        newY >= b.y + b.h
      );
      if (overlap) return false;
    }
    return true;
  };

  const handleFormResize = (dw: number, dh: number) => {
    if (!selectedCell) return;
    setFormResizeError(null);
    const newW = selectedCell.w + dw;
    const newH = selectedCell.h + dh;
    if (newW < 1 || newH < 1) return;
    if (canResize(null, selectedCell.x, selectedCell.y, newW, newH)) {
      setSelectedCell({ ...selectedCell, w: newW, h: newH });
    } else {
      setFormResizeError("Nicht genug Platz! Überschneidung mit anderen Blöcken oder dem Rand.");
      setTimeout(() => setFormResizeError(null), 3000);
    }
  };

  const handleResize = (dw: number, dh: number) => {
    if (!popupBlock) return;
    setResizeError(null);
    
    const newW = popupBlock.w + dw;
    const newH = popupBlock.h + dh;
    
    if (newW < 1 || newH < 1) return;
    
    if (canResize(popupBlock.id, popupBlock.x, popupBlock.y, newW, newH)) {
      const updatedBlock = { ...popupBlock, w: newW, h: newH };
      setBlocks(blocks.map(b => b.id === popupBlock.id ? updatedBlock : b));
      setPopupBlock(updatedBlock);
    } else {
      setResizeError("Nicht genug Platz! Überschneidung mit anderen Blöcken oder dem Rand.");
      setTimeout(() => setResizeError(null), 3000);
    }
  };

  const handleShare = async () => {
    if (!popupBlock) return;
    try {
      await navigator.clipboard.writeText(popupBlock.link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handlePaymentSuccess = () => {
    if (!selectedCell) return;

    const newBlock: Block = {
      id: Date.now().toString(),
      x: selectedCell.x,
      y: selectedCell.y,
      w: selectedCell.w,
      h: selectedCell.h,
      color: formData.color,
      title: formData.title,
      link: formData.link,
      imageUrl: formData.imageUrl,
    };

    setBlocks([...blocks, newBlock]);
    setSelectedCell(null);
    setIsSidebarOpen(false);
    setFormData({ title: '', link: '', color: '#00F0FF', imageUrl: '' });
    setHasClickedDonate(false);
  };

  const isFormValid = formData.title.trim() !== '' && formData.link.trim() !== '';

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B14] text-white font-sans selection:bg-[#00F0FF] selection:text-black relative">
      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        loop 
        src="https://cdn.pixabay.com/audio/2022/02/10/audio_fc48af67b2.mp3" 
        preload="auto"
      />

      {/* Music Toggle Button */}
      <button
        onClick={toggleMusic}
        className="fixed bottom-6 left-6 z-40 bg-[#0A101A] border border-[#00F0FF]/30 p-3 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:border-[#00F0FF] hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all group"
        title={isMusicPlaying ? "Musik pausieren" : "Beruhigende Musik abspielen"}
      >
        {isMusicPlaying ? (
          <Volume2 className="w-6 h-6 text-[#00F0FF]" />
        ) : (
          <VolumeX className="w-6 h-6 text-white/50 group-hover:text-[#00F0FF]" />
        )}
      </button>

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
            <span className="font-mono font-bold tracking-tight text-lg uppercase">my-pixel.click</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-white/60">
            <a href="#about" className="hover:text-white transition-colors">So funktioniert's</a>
            <a href="#grid" className="hover:text-white transition-colors">Das Raster</a>
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
              Spende für Pixel, platziere deine Werbung und werde Teil der digitalen Geschichte. 
              Jeder Block ist 10x10 Pixel groß. Einmal gespendet, gehört er für immer dir.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
              <a href="#grid" className="px-8 py-4 bg-[#00F0FF] text-black font-bold rounded-full hover:bg-white shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all flex items-center gap-2">
                Jetzt sichern <ArrowRight className="w-5 h-5" />
              </a>
              <a href="https://www.paypal.com/pool/9oqXETlyIR?sr=wccr" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-[#0070BA] text-white font-bold rounded-full hover:bg-[#003087] shadow-[0_0_20px_rgba(0,112,186,0.3)] hover:shadow-[0_0_30px_rgba(0,112,186,0.6)] transition-all flex items-center gap-2">
                Direkt spenden (ohne Pixel)
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
            Spende: 10 € pro Block (10x10)
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
            Spende: 10 € pro Block (10x10)
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
                <div className="text-sm text-white/50 uppercase tracking-wider font-mono">Spende pro Block</div>
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
                <MousePointerClick className="w-3.5 h-3.5" /> Klicke auf einen leeren Block, um ihn durch eine Spende zu beanspruchen
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
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
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
              <span>{selectedCell.w * 10}x{selectedCell.h * 10} Pixel</span>
            </div>
            <div className="flex justify-between text-[#00F0FF] drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">
              <span>Spende</span>
              <span>{selectedCell.w * selectedCell.h * 10},00 €</span>
            </div>
          </div>

          {/* Size Adjustments */}
          <div className="mb-6 flex flex-col gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Ausmaße anpassen (Blöcke)</label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs uppercase tracking-wider text-white/50">Breite:</span>
                <div className="flex items-center flex-1 justify-between gap-1 bg-[#050B14] p-1.5 rounded border border-white/10">
                  <button type="button" onClick={() => handleFormResize(-1, 0)} className="hover:text-[#00F0FF] disabled:opacity-50 transition-colors" disabled={selectedCell.w <= 1}><Minus className="w-4 h-4" /></button>
                  <span className="text-center font-mono">{selectedCell.w}</span>
                  <button type="button" onClick={() => handleFormResize(1, 0)} className="hover:text-[#00F0FF] transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs uppercase tracking-wider text-white/50">Höhe:</span>
                <div className="flex items-center flex-1 justify-between gap-1 bg-[#050B14] p-1.5 rounded border border-white/10">
                  <button type="button" onClick={() => handleFormResize(0, -1)} className="hover:text-[#00F0FF] disabled:opacity-50 transition-colors" disabled={selectedCell.h <= 1}><Minus className="w-4 h-4" /></button>
                  <span className="text-center font-mono">{selectedCell.h}</span>
                  <button type="button" onClick={() => handleFormResize(0, 1)} className="hover:text-[#00F0FF] transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            {formResizeError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 mt-1"
              >
                {formResizeError}
              </motion.div>
            )}
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
                placeholder="Titel eingeben"
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
                placeholder="Bild-URL eingeben"
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
              <div className={!isFormValid ? "opacity-50 pointer-events-none" : "flex flex-col gap-4"}>
                {!hasClickedDonate ? (
                  <a 
                    href="https://www.paypal.com/pool/9oqXETlyIR?sr=wccr" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => setHasClickedDonate(true)}
                    className="w-full py-4 bg-[#0070BA] hover:bg-[#003087] text-white rounded-lg flex items-center justify-center font-bold transition-colors gap-2 shadow-[0_0_15px_rgba(0,112,186,0.5)]"
                  >
                    1. Über PayPal spenden ({selectedCell.w * selectedCell.h * 10} €)
                  </a>
                ) : (
                  <div className="space-y-3">
                    <a 
                      href="https://www.paypal.com/pool/9oqXETlyIR?sr=wccr" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-[#0070BA]/30 hover:bg-[#0070BA]/50 text-white/80 rounded-lg flex items-center justify-center font-bold transition-colors gap-2 text-sm border border-[#0070BA]/50"
                    >
                      PayPal Pool erneut öffnen
                    </a>
                    <button
                      type="button"
                      onClick={handlePaymentSuccess}
                      className="w-full py-4 bg-[#00F0FF] hover:bg-white text-black rounded-lg flex items-center justify-center font-bold group transition-all duration-300 shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      2. Zahlung bestätigt - Block sichern
                    </button>
                  </div>
                )}
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
            <span className="font-mono font-bold tracking-tight uppercase">my-pixel.click</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button 
                onClick={() => setIsImpressumOpen(true)} 
                className="text-white/40 text-sm hover:text-white transition-colors underline decoration-white/20 underline-offset-4"
              >
                Impressum
              </button>
              <button 
                onClick={() => setIsDatenschutzOpen(true)} 
                className="text-white/40 text-sm hover:text-white transition-colors underline decoration-white/20 underline-offset-4"
              >
                Datenschutz
              </button>
              <button 
                onClick={() => setIsDisclaimerOpen(true)} 
                className="text-white/40 text-sm hover:text-white transition-colors underline decoration-white/20 underline-offset-4"
              >
                Haftungsausschluss
              </button>
            </div>
            <p className="text-white/40 text-sm">© 2026 my-pixel.click. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
      </div>

      {/* Impressum Modal */}
      {isImpressumOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left" onClick={() => setIsImpressumOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0A101A] border border-[#00F0FF]/30 rounded-xl p-8 max-w-2xl w-full shadow-[0_0_40px_rgba(0,240,255,0.15)] relative max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsImpressumOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-[#00F0FF] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-bold text-[#00F0FF] mb-6 pr-8">Impressum (Anbieterkennzeichnung)</h3>
            
            <div className="space-y-6 text-white/70 text-sm leading-relaxed">
              <p><strong>Angaben gemäß § 5 TMG:</strong></p>
              <p>
                Ulf Westphal<br/>
                Schultenstrasse 20<br/>
                45739 Oer-Erkenschwick
              </p>
              
              <p><strong>Kontakt:</strong><br/>
                Telefon: +49 (0) 1573572969<br/>
                E-Mail: info@my-pixel.click
              </p>

              <p><strong>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:</strong><br/>
                Ulf Westphal<br/>
                Schultenstrasse 20<br/>
                45739 Oer-Erkenschwick
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Datenschutz Modal */}
      {isDatenschutzOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left" onClick={() => setIsDatenschutzOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0A101A] border border-[#00F0FF]/30 rounded-xl p-8 max-w-2xl w-full shadow-[0_0_40px_rgba(0,240,255,0.15)] relative max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsDatenschutzOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-[#00F0FF] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-bold text-[#00F0FF] mb-6 pr-8">Datenschutzerklärung (DSGVO)</h3>
            
            <div className="space-y-6 text-white/70 text-sm leading-relaxed">
              <div>
                <h4 className="text-white font-bold mb-2">1. Datenschutz auf einen Blick</h4>
                <p>Wir nehmen den Schutz deiner persönlichen Daten sehr ernst. Wir behandeln deine personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (DSGVO) sowie dieser Datenschutzerklärung.</p>
              </div>
              
              <div>
                <h4 className="text-white font-bold mb-2">2. Datenerfassung auf dieser Website</h4>
                <p>Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf unseren Seiten personenbezogene Daten (z.B. beim Tätigen einer Spende via PayPal oder beim Eintragen deines Pixel-Blocks in Form von Links) erhoben werden, erfolgt dies stets auf freiwilliger Basis.</p>
              </div>

              <div>
                <h4 className="text-white font-bold mb-2">3. Zahlungsdienstleister (PayPal)</h4>
                <p>Wir binden auf unserer Website den Zahlungsdienstleister PayPal (PayPal (Europe) S.à.r.l. et Cie, S.C.A., 22-24 Boulevard Royal, L-2449 Luxembourg) ein. Wenn du eine freiwillige Spende tätigst, werden deine Zahlungsdaten an PayPal übermittelt. Rechtsgrundlage für die Datenverarbeitung ist Art. 6 Abs. 1 lit. b DSGVO (Vertragsabwicklung).</p>
              </div>

              <div>
                <h4 className="text-white font-bold mb-2">4. Speicher-Logik & Local Storage / Datenbank</h4>
                <p>Abhängig von der Plattformkonfiguration werden die platzierten Blöcke inklusive der von dir angegebenen Metadaten (Text und Link) anonym in der Datenbank (oder lokal im Browser) erfasst und für den Betrieb des Pixel-Rasters ausgelesen. IP-Adressen werden standardmäßig nicht dauerhaft für Tracking-Analysezwecke gespeichert, es sei denn, dies ist zur Bereitstellung der Webseite oder zur Abwehr von Cyberangriffen technisch erforderlich.</p>
              </div>

              <div>
                <h4 className="text-white font-bold mb-2">5. Deine Rechte (Auskunft & Löschung)</h4>
                <p>Du hast jederzeit das Recht auf unentgeltliche Auskunft über deine gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung. Ferner hast du ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten. Wende dich hierzu bitte an die im Impressum angegebene Adresse.</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Legal Disclaimer Modal */}
      {isDisclaimerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left" onClick={() => setIsDisclaimerOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0A101A] border border-[#00F0FF]/30 rounded-xl p-8 max-w-2xl w-full shadow-[0_0_40px_rgba(0,240,255,0.15)] relative max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsDisclaimerOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-[#00F0FF] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-bold text-[#00F0FF] mb-6 pr-8">Haftungsausschluss & Disclaimer</h3>
            
            <div className="space-y-6 text-white/70 text-sm leading-relaxed">
              <div>
                <h4 className="text-white font-bold mb-2">1. Haftung für Inhalte</h4>
                <p>Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
              </div>
              
              <div>
                <h4 className="text-white font-bold mb-2">2. Haftung für Links & Nutzerinhalte (User-Generated Content)</h4>
                <p>Unser Informationsangebot und Projekt "my-pixel.click" enthält und basiert fundamental auf Links zu externen Websites Dritter ("Pixel-Blöcke"), auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen, sondern distanzieren uns ausdrücklich davon. Für die Inhalte der verlinkten Seiten sowie die hochgeladenen Bilder und Texte ist stets der jeweilige Nutzer oder Betreiber der Seiten verantwortlich. Eine permanente inhaltliche Kontrolle der verlinkten und angezeigten Inhalte ist ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links und Inhalte umgehend entfernen.</p>
              </div>
              
              <div>
                <h4 className="text-white font-bold mb-2">3. Löschungsrecht</h4>
                <p>Wir behalten uns ausdrücklich das Recht vor, Pixel-Blöcke (inkl. Bilder, Titel und Links) ohne vorherige Ankündigung zu löschen oder abzuändern, wenn diese gegen geltendes deutsches oder internationales Recht, die guten Sitten verstoßen oder pornografische, rassistische sowie gewaltverherrlichende Inhalte aufweisen. In einem solchen Fall besteht ausdrücklich kein Anspruch auf jegliche Erstattung oder Wiederherstellung.</p>
              </div>

              <div>
                <h4 className="text-white font-bold mb-2">4. Keine finanzielle Gegenleistung</h4>
                <p>Bei der Bezahlung von Pixeln auf dieser Plattform handelt es sich um eine freiwillige Spende zur Unterstützung des Projektes. Es entsteht durch die Spende kein rechtlich bindender Anspruch auf eine dauerhafte Verfügbarkeit der Webseite, eine zugesicherte Laufzeit oder auf die Zuteilung eines kommerziellen Nutzens (z.B. Werbung). my-pixel.click ist ein Kunst- und Experimentierprojekt.</p>
              </div>

              <div>
                <h4 className="text-white font-bold mb-2">5. Urheberrecht</h4>
                <p>Die durch uns erstellten Webseiten-Inhalte unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung bedürfen der schriftlichen Zustimmung. Bei allen von Nutzern hochgeladenen Bildinhalten sowie Texten stellen die jeweiligen Eigner sicher, dass sie über die notwendigen Urheberrechts-Lizenzen verfügen; bei Verstößen haftet alleinig der publizierende Nutzer.</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    {/* Popup for Existing Block */}
      {popupBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPopupBlock(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#0A101A] border border-[#00F0FF]/30 rounded-2xl p-0 max-w-lg w-full shadow-[0_0_50px_rgba(0,240,255,0.15)] relative overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setPopupBlock(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 p-2 rounded-full transition-all z-10 backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Expanded Image Area */}
            <div className="w-full h-64 sm:h-80 bg-[#050B14] relative flex items-center justify-center group border-b border-white/5">
              {popupBlock.imageUrl ? (
                <img src={popupBlock.imageUrl} alt={popupBlock.title} className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
              ) : (
                <div 
                  className="w-full h-full opacity-30 pattern-dots" 
                  style={{ backgroundColor: popupBlock.color, backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                ></div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A101A] via-transparent to-transparent opacity-80 pointer-events-none" />
            </div>
            
            {/* Content Area */}
            <div className="p-6 md:p-8 flex flex-col gap-6 relative">
              
              {/* Header: Title and Link */}
              <div className="flex flex-col gap-3">
                <h3 className="text-3xl font-black text-white leading-tight pr-8 tracking-tight">{popupBlock.title}</h3>
                <a 
                  href={popupBlock.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#00F0FF] hover:text-white transition-colors w-fit group/link"
                >
                  <span className="font-mono text-sm truncate max-w-[280px] sm:max-w-[350px] bg-[#00F0FF]/10 px-3 py-1.5 rounded-md border border-[#00F0FF]/20 group-hover/link:bg-[#00F0FF]/20">{popupBlock.link}</span>
                  <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </a>
              </div>
              
              {/* Details & Controls */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white/5 p-4 rounded-xl border border-white/10 mt-2">
                <div className="flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-mono text-white/60">
                    <span className="bg-[#050B14] px-2 py-1 rounded">X: {popupBlock.x}</span>
                    <span className="bg-[#050B14] px-2 py-1 rounded">Y: {popupBlock.y}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-wider text-white/40 font-bold">Farbe</span>
                    <div className="w-6 h-6 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: popupBlock.color }}></div>
                  </div>
                </div>
                
                {/* Resizing Controls */}
                <div className="flex flex-col gap-3 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-xs uppercase tracking-wider text-white/50">Breite</span>
                      <div className="flex items-center gap-2 bg-[#050B14] px-1 py-0.5 rounded border border-white/5">
                        <button onClick={() => handleResize(-1, 0)} className="text-white/40 hover:text-[#00F0FF] disabled:opacity-30 p-1 transition-colors" disabled={popupBlock.w <= 1}><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center text-white font-mono text-sm">{popupBlock.w}</span>
                        <button onClick={() => handleResize(1, 0)} className="text-white/40 hover:text-[#00F0FF] p-1 transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-xs uppercase tracking-wider text-white/50">Höhe</span>
                      <div className="flex items-center gap-2 bg-[#050B14] px-1 py-0.5 rounded border border-white/5">
                        <button onClick={() => handleResize(0, -1)} className="text-white/40 hover:text-[#00F0FF] disabled:opacity-30 p-1 transition-colors" disabled={popupBlock.h <= 1}><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center text-white font-mono text-sm">{popupBlock.h}</span>
                        <button onClick={() => handleResize(0, 1)} className="text-white/40 hover:text-[#00F0FF] p-1 transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {resizeError && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20 flex items-center justify-center font-medium"
                >
                  {resizeError}
                </motion.div>
              )}
              
              {/* Actions */}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleShare}
                  className="px-5 py-4 bg-[#050B14] border border-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 hover:border-[#00F0FF]/50 transition-all group relative shadow-inner"
                  title="URL kopieren"
                >
                  {isCopied ? (
                    <CheckCircle2 className="w-5 h-5 text-[#00F0FF]" />
                  ) : (
                    <Share2 className="w-5 h-5 text-white/70 group-hover:text-[#00F0FF]" />
                  )}
                </button>
                <a 
                  href={popupBlock.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-4 bg-[#00F0FF] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] transition-all uppercase tracking-wide"
                >
                  Website Besuchen <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
