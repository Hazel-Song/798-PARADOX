'use client';

import { useEffect, useState, useCallback } from 'react';
import DistortedImage from '@/components/ui/DistortedImage';

const imageFiles = [
  '0640b8ca-aad3-447c-a2a6-211a991bcaad.png',
  '09039e70-71ac-4364-af4c-5071a856440d.png',
  '0caf760f-d15a-4718-929d-5c725531b42c.png',
  '108bb571-4972-4dad-b4de-ee7a501cf76d.png',
  '19d38705-235d-420c-8bcc-54fea77a5448.png',
  '368ad835-c2ae-464c-a144-6cf10a2e818b.png',
  '4e9dc691-7a74-4ca2-93cf-bb430dcbcd5c.png',
  '674aab60-c93f-4ed4-b290-9d756af1f70b.png',
  '818aa2a9-0bb2-45e5-9432-5186f4cf172c.jpeg',
  '90d99f46-bed6-432b-9cc0-669905d5f150.png',
  '97d99a81-846e-47fc-8d1a-69878c316253.png',
  'b3026086-dd1c-4fe0-b897-9ded855e9ebc.png',
  'b6945291-ce88-4b77-ace9-b5a15e801caa.png',
  'c115afc5-204d-4c5f-b2c2-bfb3b4841555.jpeg',
  'c7653b0f-3784-4ece-b7f8-e0d3bee7fb0c.png',
  'd0b52cef-24ff-40fc-ad37-4dc5ed816727.jpeg',
  'd8d021e0-e649-4c12-bf83-173542ab5c77.png',
  'dc6b96dc-87b8-4b7d-b06c-6ec1fae9b0fe.png',
  'dc9f88e2-ea7f-479d-9485-868c8e1c5b59.png',
  'f44a1599-fc3d-4e81-a18f-c7e91c27d142.png',
  'f9692fd6-bd02-4f6d-9ad2-1a787ec2f5bd.png',
  'fb4f3d4e-ad04-4909-8725-7699c41c9b65.png',
  '截屏2025-08-02 19.35.03.png'
];

interface ImagePosition {
  id: string;
  src: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  width?: number;
  height?: number;
}

export default function Homepage() {
  const [imagePositions, setImagePositions] = useState<ImagePosition[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [titleText, setTitleText] = useState('');
  const [typingComplete, setTypingComplete] = useState(false);
  const [loadedImages, setLoadedImages] = useState<{ src: string; width: number; height: number }[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Function to generate random image positions
  const generateImagePositions = useCallback((images: { src: string; width: number; height: number }[]) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const positions: ImagePosition[] = [];

    images.forEach((img, index) => {
      // Random position anywhere on screen
      const x = Math.random() * (screenWidth - 200); // -200 to leave some margin
      const y = Math.random() * (screenHeight - 200);

      // Random size variation (100px to 400px)
      const displayWidth = 100 + Math.random() * 300;

      // Calculate height maintaining aspect ratio
      const aspectRatio = img.height / img.width;
      const displayHeight = displayWidth * aspectRatio;

      positions.push({
        id: `img-${index}-${Date.now()}-${Math.random()}`, // Unique ID for each refresh
        src: img.src,
        x,
        y,
        scale: displayWidth / img.width,
        rotation: 0,
        width: img.width,
        height: img.height
      });
    });

    setImagePositions(positions);
  }, []);

  useEffect(() => {
    // Load all images first to get their actual dimensions
    const loadImages = async () => {
      const images = await Promise.all(
        imageFiles.map((file) => {
          return new Promise<{ src: string; width: number; height: number }>((resolve) => {
            const img = new Image();
            img.onload = () => {
              resolve({
                src: `/assets/images/homepage-archive/${file}`,
                width: img.naturalWidth,
                height: img.naturalHeight
              });
            };
            img.src = `/assets/images/homepage-archive/${file}`;
          });
        })
      );

      setLoadedImages(images);
      generateImagePositions(images);
      setImagesLoaded(true);
    };

    loadImages();
  }, [generateImagePositions]);

  // Typing effect for title
  useEffect(() => {
    const fullText = 'THE 798 PARADOX';
    let currentIndex = 0;

    const typeInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTitleText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setTypingComplete(true);
      }
    }, 100); // 100ms per character

    return () => clearInterval(typeInterval);
  }, []);

  // Random character glitch effect after typing is complete
  useEffect(() => {
    if (!typingComplete) return;

    const fullText = 'THE 798 PARADOX';
    const textArray = fullText.split('');

    const glitchText = () => {
      // Pick 1-3 random characters to hide
      const numToGlitch = Math.floor(Math.random() * 3) + 1;
      const glitchedArray = [...textArray];

      const indicesToGlitch: number[] = [];
      for (let i = 0; i < numToGlitch; i++) {
        const randomIndex = Math.floor(Math.random() * textArray.length);
        indicesToGlitch.push(randomIndex);
        glitchedArray[randomIndex] = ' '; // Replace with space
      }

      setTitleText(glitchedArray.join(''));

      // Restore characters after a short time
      setTimeout(() => {
        setTitleText(fullText);
      }, 100 + Math.random() * 200);

      // Schedule next glitch
      setTimeout(glitchText, 2000 + Math.random() * 2000);
    };

    const timeout = setTimeout(glitchText, 1000);
    return () => clearTimeout(timeout);
  }, [typingComplete]);

  // Handle ENTER button click transition
  const handleEnterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('ENTER clicked, transitioning...');
    setIsTransitioning(true);

    // After animation completes, navigate to next page
    setTimeout(() => {
      window.location.href = '/proceeding';
    }, 700); // Jump right after images are consumed
  };

  // Mouse tracking and click to refresh images
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleClick = (e: MouseEvent) => {
      // Don't refresh images if clicking on the ENTER button or if transitioning
      if (isTransitioning) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        return;
      }

      if (loadedImages.length > 0) {
        generateImagePositions(loadedImages);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [loadedImages, generateImagePositions, isTransitioning]);

  if (!imagesLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white font-mono flex items-center justify-center relative bg-black overflow-hidden">
      {/* Red Grid Background - Bottom Layer */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 0, 0, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 0, 0, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Static Random Images Background */}
      <div className="fixed inset-0 z-10">
        {imagePositions.map((img, index) => {
          const displayWidth = img.width! * img.scale;
          const displayHeight = img.height! * img.scale;

          // Calculate center position using viewport center
          const screenCenterX = typeof window !== 'undefined' ? window.innerWidth / 2 : 960;
          const screenCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 540;

          const translateX = screenCenterX - img.x - displayWidth / 2;
          const translateY = screenCenterY - img.y - displayHeight / 2;

          if (index === 0 && isTransitioning) {
            console.log('First image transitioning:', { translateX, translateY, screenCenterX, screenCenterY, imgX: img.x, imgY: img.y });
          }

          return (
            <div
              key={img.id}
              className="absolute"
              style={{
                left: `${img.x}px`,
                top: `${img.y}px`,
                mixBlendMode: 'screen'
              }}
            >
              <DistortedImage
                src={img.src}
                width={displayWidth}
                height={displayHeight}
              />
            </div>
          );
        })}
      </div>

      {/* Dark overlay - reduced opacity for clearer images */}
      <div className="fixed inset-0 bg-black/30 z-10 pointer-events-none" />

      {/* Glitch noise overlay - eats the images only */}
      {isTransitioning && (
        <div className="fixed inset-0 z-15 pointer-events-none">
          <canvas
            ref={(canvas) => {
              if (canvas && isTransitioning) {
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;

                let animationFrame: number;
                const startTime = Date.now();

                let frameCount = 0;
                const drawGlitchNoise = () => {
                  const elapsed = Date.now() - startTime;
                  const progress = Math.min(elapsed / 400, 1); // 0.4 second - faster consumption

                  // Only redraw every 8 frames for slower flicker
                  frameCount++;
                  if (frameCount % 8 === 0) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Draw glitch-style horizontal slices with black blocks
                    const numSlices = Math.floor(progress * 150) + 30; // More slices, faster growth

                    for (let i = 0; i < numSlices; i++) {
                      const y = Math.random() * canvas.height;
                      const height = Math.random() * 40 + 10; // 10-50px height - larger blocks
                      const x = Math.random() * canvas.width;
                      const width = Math.random() * 300 + 100; // 100-400px width - larger blocks

                      // Darker black blocks
                      const darkness = Math.random() * 15; // 0-15 (darker)
                      ctx.fillStyle = `rgb(${darkness}, ${darkness}, ${darkness})`;
                      ctx.fillRect(x, y, width, height);
                    }

                    // Add some horizontal scan lines of black - slower movement but darker
                    const numLines = Math.floor(progress * 50) + 10; // More lines as progress increases
                    for (let i = 0; i < numLines; i++) {
                      const y = Math.random() * canvas.height;
                      const offset = (Math.random() - 0.5) * 50; // Less horizontal movement

                      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'; // Much darker
                      ctx.fillRect(offset, y, canvas.width, 3 + Math.random() * 5);
                    }
                  }

                  if (progress < 1) {
                    animationFrame = requestAnimationFrame(drawGlitchNoise);
                  }
                };

                drawGlitchNoise();

                return () => {
                  if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                  }
                };
              }
            }}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Black transition overlay */}
      <div
        className="fixed inset-0 bg-black z-50 pointer-events-none transition-opacity duration-[200ms]"
        style={{
          opacity: isTransitioning ? 1 : 0,
          transitionDelay: isTransitioning ? '400ms' : '0ms'
        }}
      />

      {/* Mouse cursor - white box with invert effect */}
      <div
        className="fixed pointer-events-none z-40"
        style={{
          left: `${mousePos.x - 30}px`,
          top: `${mousePos.y - 30}px`,
          width: '60px',
          height: '60px',
          border: '2px solid white',
          mixBlendMode: 'difference',
          transition: 'none'
        }}
      />

      {/* Content */}
      <div className="fixed inset-0 flex items-center justify-center text-center z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-3xl mb-12 tracking-widest font-mono">
            {titleText}
          </h1>

          <button
            onClick={handleEnterClick}
            className="inline-block px-12 py-4 border border-white text-white hover:bg-white hover:text-black transition-colors uppercase tracking-[0.3em] text-sm cursor-pointer"
          >
            ENTER
          </button>
        </div>
      </div>

    </div>
  );
}
