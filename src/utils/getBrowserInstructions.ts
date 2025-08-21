const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Chrome")) {
      return [
        "1. Click the lock/info icon 🔒 in your browser's address bar",
        "2. Change microphone permission from 'Block' to 'Allow'",
        "3. Refresh the page and try again",
      ];
    } else if (userAgent.includes("Firefox")) {
      return [
        "1. Click the shield icon 🛡️ in your browser's address bar",
        "2. Click 'Allow' for microphone permissions",
        "3. Refresh the page and try again",
      ];
    } else if (userAgent.includes("Safari")) {
      return [
        "1. Go to Safari > Preferences > Websites > Microphone",
        "2. Change permission for this site to 'Allow'",
        "3. Refresh the page and try again",
      ];
    } else {
      return [
        "1. Look for a lock/info icon in your browser's address bar",
        "2. Change microphone permission from 'Block' to 'Allow'",
        "3. Refresh the page and try again",
      ];
    }
  };

  export default getBrowserInstructions;