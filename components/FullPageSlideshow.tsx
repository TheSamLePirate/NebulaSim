import React, { useState, useCallback, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { SlideImage, SlideshowRef, SlideshowProps } from '../types';

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 1.1,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
};

// Internal component to handle individual slide loading state
const Slide = ({ image, isPreloaded }: { image: SlideImage; isPreloaded: boolean }) => {
  // If preloaded, start as true. If not, wait for onLoad.
  const [isLoaded, setIsLoaded] = useState(isPreloaded);

  // If isPreloaded becomes true while mounted (rare race condition), update state
  useEffect(() => {
    if (isPreloaded) setIsLoaded(true);
  }, [isPreloaded]);

  return (
    <>
      {/* Loading Spinner - Visible until image loads */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-0 bg-zinc-900/20 backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-white/70 animate-spin" />
        </div>
      )}

      {/* Image with Fade-In Transition */}
      <img
        src={image.url}
        alt={image.alt || image.title || "Slideshow image"}
        className={`w-full h-full object-cover transition-opacity duration-700 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        onLoad={() => setIsLoaded(true)}
        draggable={false}
      />

      {/* Caption Overlay - Only visible when loaded */}
      {isLoaded && (image.title || image.description) && false && (
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-8 md:p-12 text-white pointer-events-none">
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl md:text-5xl font-bold mb-2"
          >
            {image.title}
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl opacity-90 max-w-2xl"
          >
            {image.description}
          </motion.p>
        </div>
      )}
    </>
  );
};

export const FullPageSlideshow = forwardRef<SlideshowRef, SlideshowProps>(({
  images,
  initialId,
  className = ""
}, ref) => {
  // Determine initial index
  const startIdx = initialId
    ? images.findIndex(img => img.id === initialId)
    : 0;

  const [index, setIndex] = useState(startIdx === -1 ? 0 : startIdx);
  const [direction, setDirection] = useState(0);

  // Track globally loaded images to avoid showing spinner on revisit
  const [loadedImageIds, setLoadedImageIds] = useState<Set<string>>(new Set());

  // Ref to hold actual Image objects to prevent garbage collection
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());

  // Safe index wrap logic
  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) nextIndex = images.length - 1;
      if (nextIndex >= images.length) nextIndex = 0;
      return nextIndex;
    });
  }, [images.length]);

  // Preload all images at startup
  useEffect(() => {
    if (!images || images.length === 0) return;

    images.forEach((imgData) => {
      // If we already have a ref for this ID, skip
      if (imageRefs.current.has(imgData.id)) return;

      const img = new Image();
      img.src = imgData.url;

      const markLoaded = () => {
        setLoadedImageIds((prev) => {
          if (prev.has(imgData.id)) return prev;
          const next = new Set(prev);
          next.add(imgData.id);
          return next;
        });
      };

      if (img.complete) {
        markLoaded();
      } else {
        img.onload = markLoaded;
        img.onerror = () => {
          console.warn(`Failed to preload image: ${imgData.url}`);
        };
      }

      // Store ref to keep in memory
      imageRefs.current.set(imgData.id, img);
    });
  }, [images]);

  // Exposed API via ref
  useImperativeHandle(ref, () => ({
    next: () => paginate(1),
    prev: () => paginate(-1),
    showImage: (id: string) => {
      const newIndex = images.findIndex((img) => img.id === id);
      if (newIndex !== -1 && newIndex !== index) {
        setDirection(newIndex > index ? 1 : -1);
        setIndex(newIndex);
      } else if (newIndex === -1) {
        console.warn(`Image with id "${id}" not found.`);
      }
    }
  }));

  if (!images || images.length === 0) {
    return <div className="flex items-center justify-center h-full bg-black text-white">No images to display</div>;
  }

  const currentImage = images[index];
  // Check if current image is already known to be loaded
  const isPreloaded = loadedImageIds.has(currentImage.id);

  return (
    <div className={`fixed top-0 left-0 right-0 bottom-0 w-full h-full overflow-hidden bg-black ${className} z-[100]`}>
      {/* Main Image Stage */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentImage.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.4 },
            scale: { duration: 0.4 }
          }}
          className="absolute inset-0 w-full h-full"
        >
          <Slide image={currentImage} isPreloaded={isPreloaded} />
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicator */}
      {/* <div className="absolute top-0 left-0 w-full p-6 flex justify-center space-x-2 z-10 pointer-events-none">
        {images.map((img, idx) => (
          <div
            key={img.id}
            className={`h-1 rounded-full transition-all duration-300 ${idx === index ? 'w-8 bg-white' : 'w-4 bg-white/30'
              }`}
          />
        ))}
      </div> */}
    </div>
  );
});

FullPageSlideshow.displayName = 'FullPageSlideshow';

