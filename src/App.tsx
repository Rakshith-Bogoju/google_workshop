import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Constants & Types ---
const GRID_SIZE = 20;
const TILE_SIZE = 20;
const CANVAS_SIZE = 400;
const GAME_SPEED = 100;

type Point = { x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

const TRACKS = [
  { id: 1, title: "SYS.REQ.01", artist: "AI_GEN_ALPHA", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "MEM.LEAK.02", artist: "AI_GEN_BETA", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, title: "NULL.PTR.03", artist: "AI_GEN_GAMMA", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
];

export default function App() {
  // --- React State ---
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- Mutable Game State (Refs for Canvas Loop) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const dirRef = useRef<Point>({ x: 0, y: -1 });
  const nextDirRef = useRef<Point>({ x: 0, y: -1 });
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<number>(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Game Engine ---
  const spawnFood = useCallback(() => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      const isOnSnake = snakeRef.current.some(s => s.x === newFood.x && s.y === newFood.y);
      if (!isOnSnake) break;
    }
    foodRef.current = newFood;
  }, []);

  const resetGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    dirRef.current = { x: 0, y: -1 };
    nextDirRef.current = { x: 0, y: -1 };
    setScore(0);
    spawnFood();
    particlesRef.current = [];
    shakeRef.current = 0;
    setGameState('PLAYING');
  }, [spawnFood]);

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x * TILE_SIZE + TILE_SIZE / 2,
        y: y * TILE_SIZE + TILE_SIZE / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1.0,
        color: Math.random() > 0.5 ? color : '#fff'
      });
    }
  };

  const update = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return;

    if (time - lastTimeRef.current > GAME_SPEED) {
      lastTimeRef.current = time;
      dirRef.current = nextDirRef.current;

      const head = snakeRef.current[0];
      const newHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameState('GAMEOVER');
        shakeRef.current = 20; // Big shake
        spawnParticles(head.x, head.y, '#f0f', 30);
        return;
      }

      // Self collision
      if (snakeRef.current.some(s => s.x === newHead.x && s.y === newHead.y)) {
        setGameState('GAMEOVER');
        shakeRef.current = 20;
        spawnParticles(head.x, head.y, '#f0f', 30);
        return;
      }

      snakeRef.current.unshift(newHead);

      // Food collision
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        setScore(s => {
          const newScore = s + 10;
          setHighScore(h => Math.max(h, newScore));
          return newScore;
        });
        shakeRef.current = 5; // Small shake
        spawnParticles(foodRef.current.x, foodRef.current.y, '#0ff', 15);
        spawnFood();
      } else {
        snakeRef.current.pop();
      }
    }
  }, [gameState, spawnFood]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();

    // Apply Shake
    if (shakeRef.current > 0) {
      const magnitude = shakeRef.current;
      const dx = (Math.random() - 0.5) * magnitude;
      const dy = (Math.random() - 0.5) * magnitude;
      ctx.translate(dx, dy);
      if (gameState === 'PLAYING') shakeRef.current *= 0.8; // Decay shake
      if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // Draw Grid (optional subtle background)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += TILE_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
    }

    // Draw Food
    ctx.fillStyle = '#f0f';
    ctx.shadowColor = '#f0f';
    ctx.shadowBlur = 10;
    ctx.fillRect(foodRef.current.x * TILE_SIZE + 2, foodRef.current.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.shadowBlur = 0;

    // Draw Snake
    snakeRef.current.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#fff' : '#0ff';
      ctx.shadowColor = '#0ff';
      ctx.shadowBlur = i === 0 ? 15 : 5;
      ctx.fillRect(seg.x * TILE_SIZE + 1, seg.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    });
    ctx.shadowBlur = 0;

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, 3, 3);
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
    });
    ctx.globalAlpha = 1.0;
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    ctx.restore();
  }, [gameState]);

  const gameLoop = useCallback((time: number) => {
    update(time);
    draw();
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameLoop]);

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (gameState === 'START' || gameState === 'GAMEOVER') {
        if (e.key === 'Enter' || e.key === ' ') resetGame();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (dirRef.current.y === 0) nextDirRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
          if (dirRef.current.y === 0) nextDirRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
          if (dirRef.current.x === 0) nextDirRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
          if (dirRef.current.x === 0) nextDirRef.current = { x: 1, y: 0 };
          break;
        case ' ':
          setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : 'PLAYING');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, resetGame]);

  // --- Music Logic ---
  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying, currentTrack]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => setCurrentTrack((c) => (c + 1) % TRACKS.length);
  const prevTrack = () => setCurrentTrack((c) => (c - 1 + TRACKS.length) % TRACKS.length);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 crt-flicker font-mono selection:bg-[#f0f] selection:text-[#050505]">
      <div className="scanlines" />
      <div className="noise" />

      {/* Header */}
      <div className="text-center mb-8 z-10">
        <h1 className="text-6xl md:text-8xl font-black glitch-text tracking-tighter">
          SYS.SNAKE
        </h1>
        <p className="text-[#f0f] mt-2 tracking-widest text-xl">
          [ AUDIO_VISUAL_INTERFACE_v1.0 ]
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-12 items-center xl:items-start max-w-6xl w-full justify-center z-10">
        
        {/* Game Section */}
        <div className="flex flex-col gap-6 w-full max-w-[400px]">
          {/* Score Board */}
          <div className="flex justify-between items-center brutal-border p-4">
            <div className="flex flex-col">
              <span className="text-[#0ff] text-sm tracking-wider">SCORE_</span>
              <span className="text-white font-black text-3xl">
                {score.toString().padStart(4, '0')}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[#f0f] text-sm tracking-wider">HI_SCORE_</span>
              <span className="text-white font-black text-3xl">
                {highScore.toString().padStart(4, '0')}
              </span>
            </div>
          </div>

          {/* Game Board */}
          <div className="relative canvas-container bg-[#050505]">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block w-full h-full"
            />

            {/* Overlays */}
            {gameState === 'START' && (
              <div className="absolute inset-0 bg-[#050505]/80 flex items-center justify-center">
                <div className="text-[#0ff] text-2xl animate-pulse text-center">
                  [ PRESS ENTER TO INIT ]
                </div>
              </div>
            )}

            {gameState === 'PAUSED' && (
              <div className="absolute inset-0 bg-[#050505]/80 flex items-center justify-center">
                <div className="text-[#f0f] text-3xl glitch-text">
                  SYS.PAUSED
                </div>
              </div>
            )}

            {gameState === 'GAMEOVER' && (
              <div className="absolute inset-0 bg-[#050505]/90 flex flex-col items-center justify-center gap-6">
                <div className="text-[#f0f] text-5xl glitch-text">
                  FATAL_ERR
                </div>
                <div className="text-white text-xl">SCORE: {score}</div>
                <button
                  onClick={resetGame}
                  className="brutal-border px-6 py-3 text-xl text-[#0ff] hover:bg-[#f0f] hover:text-[#050505]"
                >
                  [ REBOOT ]
                </button>
              </div>
            )}
          </div>
          
          <div className="text-center text-[#0ff]/50 text-sm">
            INPUT: ARROWS / WASD | HALT: SPACE
          </div>
        </div>

        {/* Music Player Section */}
        <div className="w-full max-w-[400px] brutal-border p-8 flex flex-col gap-8 relative">
          
          {/* Track Info */}
          <div className="space-y-2">
            <div className="text-[#0ff] text-sm">CURRENT_PROCESS:</div>
            <h2 className="text-3xl text-white glitch-text truncate">
              {TRACKS[currentTrack].title}
            </h2>
            <p className="text-[#f0f] text-xl">{TRACKS[currentTrack].artist}</p>
          </div>

          {/* Visualizer (Fake) */}
          <div className="flex items-end justify-between h-20 gap-1">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className={`w-full transition-all ${isPlaying ? 'bg-[#0ff]' : 'bg-[#0ff]/20 h-2'}`}
                style={{
                  height: isPlaying ? `${20 + Math.random() * 80}%` : '8px',
                  animation: isPlaying ? `flicker ${0.1 + Math.random() * 0.3}s infinite alternate` : 'none'
                }}
              />
            ))}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-6 w-full border-2 border-[#0ff] relative cursor-pointer"
                 onClick={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const percent = (e.clientX - rect.left) / rect.width;
                   const time = percent * duration;
                   if (audioRef.current) audioRef.current.currentTime = time;
                   setProgress(time);
                 }}>
              <div className="h-full bg-[#f0f] transition-all duration-100" style={{ width: `${(progress / (duration || 1)) * 100}%` }} />
            </div>
            <div className="flex justify-between text-lg text-[#0ff]">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <button onClick={prevTrack} className="brutal-border flex-1 py-3 text-xl text-[#0ff] hover:bg-[#f0f] hover:text-[#050505]">
              [ &lt;&lt; ]
            </button>
            <button
              onClick={togglePlay}
              className="brutal-border flex-1 py-3 text-xl text-[#0ff] hover:bg-[#f0f] hover:text-[#050505]"
            >
              {isPlaying ? '[ PAUSE ]' : '[ PLAY ]'}
            </button>
            <button onClick={nextTrack} className="brutal-border flex-1 py-3 text-xl text-[#0ff] hover:bg-[#f0f] hover:text-[#050505]">
              [ &gt;&gt; ]
            </button>
          </div>
        </div>
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={TRACKS[currentTrack].url}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={nextTrack}
      />
    </div>
  );
}
