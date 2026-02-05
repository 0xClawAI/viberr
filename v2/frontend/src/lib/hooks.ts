import { useState, useEffect } from "react";

// Hook to check if component is mounted (client-side)
export function useIsMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard hydration pattern
    setMounted(true);
  }, []);

  return mounted;
}
