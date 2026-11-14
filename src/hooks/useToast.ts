import { useCallback, useEffect, useRef, useState } from "react";

export function useToast(durationMs = 2300) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<number>();

  const show = useCallback(
    (msg: string) => {
      setMessage(msg);
      setVisible(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setVisible(false), durationMs);
    },
    [durationMs],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { message, visible, show };
}
