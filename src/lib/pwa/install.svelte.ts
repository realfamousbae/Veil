interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Installing Veil as a Home Screen app (PLAN.md §7.1). Everything here stays local. */
class InstallState {
  /** Already running as an installed app. */
  standalone = $state(false);
  /** iOS/iPadOS: installable only by hand, via Share → Add to Home Screen. */
  ios = $state(false);
  #prompt = $state.raw<BeforeInstallPromptEvent | null>(null);
  /** The browser offers a native install dialog (Chromium-based browsers). */
  canPrompt = $derived(this.#prompt !== null);

  init(): void {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = matchMedia('(display-mode: standalone)');
    this.standalone = standalone.matches || nav.standalone === true;
    standalone.addEventListener('change', (e) => (this.standalone = e.matches));
    // iPadOS reports itself as a Mac; touch support gives it away.
    this.ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // show our own button at a sensible moment instead
      this.#prompt = e as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
      this.#prompt = null;
      this.standalone = true;
    });
  }

  async install(): Promise<void> {
    const prompt = this.#prompt;
    if (!prompt) return;
    this.#prompt = null; // a prompt event can be used once
    await prompt.prompt();
  }
}

export const installState = new InstallState();
