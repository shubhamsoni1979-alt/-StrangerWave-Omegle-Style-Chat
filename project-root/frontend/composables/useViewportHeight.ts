import { onMounted, onUnmounted } from "vue";

export function useViewportHeight() {
  function updateHeight() {
    if (typeof window === "undefined") return;
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty("--vh", `${height}px`);
  }

  onMounted(() => {
    updateHeight();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateHeight);
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", updateHeight);
        window.visualViewport.addEventListener("scroll", updateHeight);
      }
    }
  });

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", updateHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateHeight);
        window.visualViewport.removeEventListener("scroll", updateHeight);
      }
    }
  });
}
