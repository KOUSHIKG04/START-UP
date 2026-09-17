import { useEffect, useRef, useState } from "react";

export const DEFAULT_SEARCH_WORDS = [
  "doctor",
  "symptoms",
  "specialities",
  "medicines",
  "clinics",
] as const;

interface UseTypewriterPlaceholderOptions {
  words?: readonly string[];
  prefix?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseTime?: number;
  emptyPauseTime?: number;
}

export function useTypewriterPlaceholder({
  words = DEFAULT_SEARCH_WORDS,
  prefix = "Search for ",
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseTime = 1500,
  emptyPauseTime = 300,
}: UseTypewriterPlaceholderOptions = {}): string {
  const [displayedText, setDisplayedText] = useState("");
  const stateRef = useRef({
    wordIndex: 0,
    charIndex: 0,
    isDeleting: false,
  });

  useEffect(() => {
    if (!words.length) return;

    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const { wordIndex, charIndex, isDeleting } = stateRef.current;
      const currentWord = words[wordIndex % words.length] ?? "";

      if (!isDeleting) {
        if (charIndex < currentWord.length) {
          const nextIndex = charIndex + 1;
          stateRef.current.charIndex = nextIndex;
          setDisplayedText(currentWord.slice(0, nextIndex));
          timer = setTimeout(tick, typingSpeed);
        } else {
          // Pause when word is completely typed
          stateRef.current.isDeleting = true;
          timer = setTimeout(tick, pauseTime);
        }
      } else {
        if (charIndex > 0) {
          const nextIndex = charIndex - 1;
          stateRef.current.charIndex = nextIndex;
          setDisplayedText(currentWord.slice(0, nextIndex));
          timer = setTimeout(tick, deletingSpeed);
        } else {
          // Pause briefly when fully deleted, then move to next word
          stateRef.current.isDeleting = false;
          stateRef.current.wordIndex = (wordIndex + 1) % words.length;
          timer = setTimeout(tick, emptyPauseTime);
        }
      }
    };

    timer = setTimeout(tick, typingSpeed);

    return () => {
      clearTimeout(timer);
    };
  }, [words, typingSpeed, deletingSpeed, pauseTime, emptyPauseTime]);

  return `${prefix}${displayedText}`;
}
