import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

export function keyboardScrollAdjustment({
  inputTop,
  inputHeight,
  viewportTop,
  viewportHeight,
  keyboardTop,
  gap = 24,
}: {
  inputTop: number;
  inputHeight: number;
  viewportTop: number;
  viewportHeight: number;
  keyboardTop: number;
  gap?: number;
}) {
  const visibleBottom = Math.min(viewportTop + viewportHeight, keyboardTop);
  const overlap = inputTop + inputHeight + gap - visibleBottom;
  return overlap > 0 ? overlap : Math.min(0, inputTop - viewportTop - gap);
}

/** Measures the actual scroll viewport, covering both resize and overlay keyboards. */
export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const offset = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const mounted = useRef(true);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const revealFocusedInput = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = TextInput.State.currentlyFocusedInput();
      const keyboardY = keyboardTop.current ?? Keyboard.metrics()?.screenY;
      const viewport = scrollRef.current?.getNativeScrollRef();
      if (
        !mounted.current ||
        !Keyboard.isVisible() ||
        !input ||
        !viewport ||
        keyboardY == null
      )
        return;
      // Ignore an input in another screen or a modal above this form.
      input.measureLayout(
        viewport,
        () => {
          viewport.measureInWindow((_x, viewportY, _width, viewportHeight) => {
            if (!mounted.current || !Keyboard.isVisible()) return;
            setKeyboardInset(
              Math.max(0, viewportY + viewportHeight - keyboardY) + 24
            );
            input.measureInWindow(
              (_inputX, inputY, _inputWidth, inputHeight) => {
                if (
                  !mounted.current ||
                  !Keyboard.isVisible() ||
                  TextInput.State.currentlyFocusedInput() !== input
                )
                  return;
                const delta = keyboardScrollAdjustment({
                  inputTop: inputY,
                  inputHeight,
                  viewportTop: viewportY,
                  viewportHeight,
                  keyboardTop: keyboardY,
                });
                if (Math.abs(delta) > 1)
                  scrollRef.current?.scrollTo({
                    y: Math.max(0, offset.current + delta),
                    animated: true,
                  });
              }
            );
          });
        },
        () => undefined
      );
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      revealFocusedInput();
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardTop.current = null;
      setKeyboardInset(0);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    });
    return () => {
      mounted.current = false;
      show.remove();
      hide.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [revealFocusedInput]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset.y;
    },
    []
  );
  return { scrollRef, keyboardInset, revealFocusedInput, onScroll };
}
