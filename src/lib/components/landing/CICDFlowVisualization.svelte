<script lang="ts">
  import { onMount } from 'svelte';
  import { GitBranch, Hammer, CheckCircle, Rocket, ArrowRight } from 'lucide-svelte';

  interface FlowStep {
    id: number;
    icon: typeof GitBranch;
    title: string;
    description: string;
    color: string;
    bgGradient: string;
  }

  let activeStep = $state(0);

  const steps: FlowStep[] = [
    {
      id: 1,
      icon: GitBranch,
      title: 'GitHub 웹훅',
      description: 'Push 이벤트 감지',
      color: 'text-green-400',
      bgGradient: 'from-green-500/20 to-green-600/20'
    },
    {
      id: 2,
      icon: Hammer,
      title: 'Build',
      description: '소스코드 빌드',
      color: 'text-blue-400',
      bgGradient: 'from-blue-500/20 to-blue-600/20'
    },
    {
      id: 3,
      icon: CheckCircle,
      title: 'Test',
      description: '자동화 테스트',
      color: 'text-purple-400',
      bgGradient: 'from-purple-500/20 to-purple-600/20'
    },
    {
      id: 4,
      icon: Rocket,
      title: 'Deploy',
      description: '서비스 배포',
      color: 'text-orange-400',
      bgGradient: 'from-orange-500/20 to-orange-600/20'
    }
  ];

  onMount(() => {
    const interval = setInterval(() => {
      activeStep = (activeStep + 1) % steps.length;
    }, 2000);

    return () => clearInterval(interval);
  });
</script>

<div class="relative mx-auto max-w-6xl">
  <!-- Background Effects -->
  <div
    class="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-900/10 via-blue-900/10 to-purple-900/10 blur-3xl"
  ></div>
  <div class="bg-gradient-radial absolute inset-0 rounded-3xl from-white/5 to-transparent"></div>

  <!-- Floating Particles -->
  <div class="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
    {#each Array(6) as _, i (i)}
      <div
        class="animate-float absolute h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-30"
        style="
          left: {Math.random() * 100}%;
          top: {Math.random() * 100}%;
          animation-delay: {i * 0.5}s;
          animation-duration: {3 + Math.random() * 2}s;
        "
      ></div>
    {/each}
  </div>

  <!-- Main Content -->
  <div
    class="relative rounded-3xl border border-gray-700/50 bg-gray-900/50 p-4 backdrop-blur-sm sm:p-6 md:p-8"
  >
    <!-- Desktop Grid -->
    <div class="mb-4 hidden items-stretch gap-2 lg:mb-8 lg:grid lg:grid-cols-7 lg:gap-4">
      {#each steps as step, index (step.id)}
        <!-- Step Card -->
        <div class="col-span-1 h-full">
          <div
            class="group relative h-full transition-all duration-500"
            class:scale-105={activeStep === index}
            class:opacity-50={activeStep !== index}
          >
            <!-- Glow Effect -->
            {#if activeStep === index}
              <div
                class="absolute -inset-2 bg-gradient-to-r {step.bgGradient} animate-pulse rounded-2xl opacity-50 blur-lg"
              ></div>
            {/if}

            <!-- Card -->
            <div
              class="relative flex h-full flex-col rounded-2xl border border-gray-700/50 bg-gray-800/80 p-3 backdrop-blur-sm transition-all duration-500 lg:p-4"
              class:shadow-2xl={activeStep === index}
            >
              <!-- Icon -->
              <div
                class="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r {step.bgGradient} transition-transform duration-500 lg:h-10 lg:w-10"
                class:rotate-6={activeStep === index}
              >
                {#if step.icon === GitBranch}
                  <GitBranch class="h-4 w-4 {step.color} lg:h-5 lg:w-5" />
                {:else if step.icon === Hammer}
                  <Hammer class="h-4 w-4 {step.color} lg:h-5 lg:w-5" />
                {:else if step.icon === CheckCircle}
                  <CheckCircle class="h-4 w-4 {step.color} lg:h-5 lg:w-5" />
                {:else if step.icon === Rocket}
                  <Rocket class="h-4 w-4 {step.color} lg:h-5 lg:w-5" />
                {/if}
              </div>

              <!-- Content -->
              <div class="flex flex-1 flex-col text-center">
                <h3 class="mb-1 text-sm font-bold text-white">{step.title}</h3>
                <p class="text-xs text-gray-400">{step.description}</p>
              </div>

              <!-- Active Indicator -->
              {#if activeStep === index}
                <div
                  class="absolute top-4 right-4 h-3 w-3 bg-gradient-to-r {step.bgGradient} animate-ping rounded-full"
                ></div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Arrow -->
        {#if index < steps.length - 1}
          <div class="col-span-1 flex items-center justify-center">
            <ArrowRight
              class={`h-6 w-6 transition-all duration-500 ${
                activeStep === index ? 'scale-125 text-purple-400' : 'text-gray-600'
              }`}
            />
          </div>
        {/if}
      {/each}
    </div>

    <!-- Mobile/Tablet Grid -->
    <div class="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 lg:hidden">
      {#each steps as step, index (step.id)}
        <div
          class="group relative h-full transition-all duration-500"
          class:scale-105={activeStep === index}
          class:opacity-50={activeStep !== index}
        >
          <!-- Glow Effect -->
          {#if activeStep === index}
            <div
              class="absolute -inset-2 bg-gradient-to-r {step.bgGradient} animate-pulse rounded-2xl opacity-50 blur-lg"
            ></div>
          {/if}

          <!-- Card -->
          <div
            class="relative flex h-full flex-col rounded-2xl border border-gray-700/50 bg-gray-800/80 p-3 backdrop-blur-sm transition-all duration-500 sm:p-4"
            class:shadow-2xl={activeStep === index}
          >
            <!-- Icon -->
            <div
              class="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r {step.bgGradient} transition-transform duration-500 sm:h-10 sm:w-10"
              class:rotate-6={activeStep === index}
            >
              {#if step.icon === GitBranch}
                <GitBranch class="h-4 w-4 {step.color} sm:h-5 sm:w-5" />
              {:else if step.icon === Hammer}
                <Hammer class="h-4 w-4 {step.color} sm:h-5 sm:w-5" />
              {:else if step.icon === CheckCircle}
                <CheckCircle class="h-4 w-4 {step.color} sm:h-5 sm:w-5" />
              {:else if step.icon === Rocket}
                <Rocket class="h-4 w-4 {step.color} sm:h-5 sm:w-5" />
              {/if}
            </div>

            <!-- Content -->
            <div class="flex flex-1 flex-col text-center">
              <h3 class="mb-1 text-xs font-bold text-white sm:text-sm">{step.title}</h3>
              <p class="text-xs text-gray-400">{step.description}</p>
            </div>

            <!-- Active Indicator -->
            {#if activeStep === index}
              <div
                class="absolute top-4 right-4 h-3 w-3 bg-gradient-to-r {step.bgGradient} animate-ping rounded-full"
              ></div>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- Mobile Flow Indicator -->
    <div class="mb-3 flex justify-center space-x-2 lg:hidden">
      {#each steps as _, index (index)}
        <div
          class="h-2 w-2 rounded-full transition-all duration-500 sm:h-3 sm:w-3"
          class:bg-purple-500={activeStep === index}
          class:bg-gray-600={activeStep !== index}
          class:scale-125={activeStep === index}
        ></div>
      {/each}
    </div>

    <!-- Description -->
    <div class="text-center">
      <p class="text-sm leading-relaxed text-gray-400 sm:text-base lg:text-lg">
        블록을 드래그하여 CI/CD 파이프라인을 구성하고,
        <br class="hidden sm:block" />
        자동화된 워크플로우를 만들어보세요.
      </p>
    </div>
  </div>
</div>

<style>
  @keyframes float {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg);
    }
    33% {
      transform: translateY(-10px) rotate(1deg);
    }
    66% {
      transform: translateY(5px) rotate(-1deg);
    }
  }

  .animate-float {
    animation: float linear infinite;
  }

  .bg-gradient-radial {
    background: radial-gradient(circle, var(--tw-gradient-stops));
  }
</style>
