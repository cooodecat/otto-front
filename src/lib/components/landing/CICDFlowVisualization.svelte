<script lang="ts">
  import { onMount } from 'svelte';
  import { GitBranch, Hammer, CheckCircle, Rocket, ArrowRight } from 'lucide-svelte';

  interface FlowStep {
    id: number;
    icon: any;
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
      bgGradient: 'from-green-500/20 to-green-600/20',
    },
    {
      id: 2,
      icon: Hammer,
      title: 'Build',
      description: '소스코드 빌드',
      color: 'text-blue-400',
      bgGradient: 'from-blue-500/20 to-blue-600/20',
    },
    {
      id: 3,
      icon: CheckCircle,
      title: 'Test',
      description: '자동화 테스트',
      color: 'text-purple-400',
      bgGradient: 'from-purple-500/20 to-purple-600/20',
    },
    {
      id: 4,
      icon: Rocket,
      title: 'Deploy',
      description: '서비스 배포',
      color: 'text-orange-400',
      bgGradient: 'from-orange-500/20 to-orange-600/20',
    },
  ];

  onMount(() => {
    const interval = setInterval(() => {
      activeStep = (activeStep + 1) % steps.length;
    }, 2000);

    return () => clearInterval(interval);
  });
</script>

<div class="relative max-w-6xl mx-auto">
  <!-- Background Effects -->
  <div class="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-blue-900/10 to-purple-900/10 rounded-3xl blur-3xl"></div>
  <div class="absolute inset-0 bg-gradient-radial from-white/5 to-transparent rounded-3xl"></div>

  <!-- Floating Particles -->
  <div class="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
    {#each Array(6) as _, i}
      <div
        class="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-30 animate-float"
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
  <div class="relative bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-8 sm:p-12">
    <!-- Desktop Grid -->
    <div class="hidden lg:grid lg:grid-cols-7 gap-4 items-center mb-8">
      {#each steps as step, index}
        <!-- Step Card -->
        <div class="col-span-1">
          <div
            class="relative group transition-all duration-500"
            class:scale-105={activeStep === index}
            class:opacity-50={activeStep !== index}
          >
            <!-- Glow Effect -->
            {#if activeStep === index}
              <div class="absolute -inset-2 bg-gradient-to-r {step.bgGradient} rounded-2xl blur-lg opacity-50 animate-pulse"></div>
            {/if}

            <!-- Card -->
            <div
              class="relative bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 transition-all duration-500"
              class:shadow-2xl={activeStep === index}
            >
              <!-- Icon -->
              <div class="w-12 h-12 bg-gradient-to-r {step.bgGradient} rounded-xl flex items-center justify-center mb-4 transition-transform duration-500" class:rotate-6={activeStep === index}>
                {#if step.icon === GitBranch}
                  <GitBranch class="w-6 h-6 {step.color}" />
                {:else if step.icon === Hammer}
                  <Hammer class="w-6 h-6 {step.color}" />
                {:else if step.icon === CheckCircle}
                  <CheckCircle class="w-6 h-6 {step.color}" />
                {:else if step.icon === Rocket}
                  <Rocket class="w-6 h-6 {step.color}" />
                {/if}
              </div>

              <!-- Content -->
              <h3 class="text-sm font-bold text-white mb-1">{step.title}</h3>
              <p class="text-xs text-gray-400">{step.description}</p>

              <!-- Active Indicator -->
              {#if activeStep === index}
                <div class="absolute top-4 right-4 w-3 h-3 bg-gradient-to-r {step.bgGradient} rounded-full animate-ping"></div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Arrow -->
        {#if index < steps.length - 1}
          <div class="col-span-1 flex items-center justify-center">
            <ArrowRight
              class={`w-6 h-6 transition-all duration-500 ${
                activeStep === index 
                  ? 'text-purple-400 scale-125' 
                  : 'text-gray-600'
              }`}
            />
          </div>
        {/if}
      {/each}
    </div>

    <!-- Mobile/Tablet Grid -->
    <div class="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
      {#each steps as step, index}
        <div
          class="relative group transition-all duration-500"
          class:scale-105={activeStep === index}
          class:opacity-50={activeStep !== index}
        >
          <!-- Glow Effect -->
          {#if activeStep === index}
            <div class="absolute -inset-2 bg-gradient-to-r {step.bgGradient} rounded-2xl blur-lg opacity-50 animate-pulse"></div>
          {/if}

          <!-- Card -->
          <div
            class="relative bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 transition-all duration-500"
            class:shadow-2xl={activeStep === index}
          >
            <!-- Icon -->
            <div class="w-12 h-12 bg-gradient-to-r {step.bgGradient} rounded-xl flex items-center justify-center mb-4 transition-transform duration-500" class:rotate-6={activeStep === index}>
              {#if step.icon === GitBranch}
                <GitBranch class="w-6 h-6 {step.color}" />
              {:else if step.icon === Hammer}
                <Hammer class="w-6 h-6 {step.color}" />
              {:else if step.icon === CheckCircle}
                <CheckCircle class="w-6 h-6 {step.color}" />
              {:else if step.icon === Rocket}
                <Rocket class="w-6 h-6 {step.color}" />
              {/if}
            </div>

            <!-- Content -->
            <h3 class="text-lg font-bold text-white mb-2">{step.title}</h3>
            <p class="text-sm text-gray-400">{step.description}</p>

            <!-- Active Indicator -->
            {#if activeStep === index}
              <div class="absolute top-4 right-4 w-3 h-3 bg-gradient-to-r {step.bgGradient} rounded-full animate-ping"></div>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- Mobile Flow Indicator -->
    <div class="lg:hidden flex justify-center space-x-2 mb-8">
      {#each steps as _, index}
        <div
          class="w-3 h-3 rounded-full transition-all duration-500"
          class:bg-purple-500={activeStep === index}
          class:bg-gray-600={activeStep !== index}
          class:scale-125={activeStep === index}
        ></div>
      {/each}
    </div>

    <!-- Description -->
    <div class="text-center">
      <p class="text-gray-400 text-lg leading-relaxed">
        블록을 드래그하여 CI/CD 파이프라인을 구성하고,
        <br class="hidden sm:block" />
        자동화된 워크플로우를 만들어보세요.
      </p>
    </div>
  </div>
</div>

<style>
  @keyframes float {
    0%, 100% {
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