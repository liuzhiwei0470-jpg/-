import { onMounted, onUnmounted, type Ref } from 'vue';

export function useClickOutside(
  elementRef: Ref<HTMLElement | null>,
  callback: () => void,
  excludeRefs: Ref<HTMLElement | null>[] = []
) {
  function handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (elementRef.value && !elementRef.value.contains(target)) {
      const clickedExcluded = excludeRefs.some(ref => ref.value?.contains(target));
      if (!clickedExcluded) {
        callback();
      }
    }
  }

  onMounted(() => {
    document.addEventListener('mousedown', handleClick);
  });

  onUnmounted(() => {
    document.removeEventListener('mousedown', handleClick);
  });

  return { handleClick };
}
