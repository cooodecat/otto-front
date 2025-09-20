<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    children?: import('svelte').Snippet;
    class?: string;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
  }

  let { children, class: className = '', delay = 0, direction = 'up' }: Props = $props();

  let element: HTMLDivElement;
  let isVisible = $state(false);

  const getInitialTransform = () => {
    switch (direction) {
      case 'up':
        return 'translateY(30px)';
      case 'down':
        return 'translateY(-30px)';
      case 'left':
        return 'translateX(30px)';
      case 'right':
        return 'translateX(-30px)';
      default:
        return 'translateY(30px)';
    }
  };

  onMount(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            isVisible = true;
          }, delay);
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  });
</script>

<div
  bind:this={element}
  class={`transition-all duration-1000 ease-out ${className}`}
  style="
    opacity: {isVisible ? '1' : '0'};
    transform: {isVisible ? 'translateY(0) translateX(0)' : getInitialTransform()};
  "
>
  {#if children}
    {@render children()}
  {/if}
</div>
