# EkaMedAssist Widget Usage Guide

This guide explains how to easily inject and use the EkaMedAssist widget in your website with type safety.

## Quick Start

### 1. Include the Widget Loader

Add the widget-loader.js script to your HTML:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Website</title>
  </head>
  <body>
    <!-- Your content -->

    <!-- Include widget loader -->
    <script src="https://cdn.ekacare.co/apollo/widget-loader.js"></script>
    <!-- <script scr="https://cdn-dev.eka.care/apollo/widget-loader.js"></script> -->
    <!-- Initialize widget -->
    <script>
      window.EkaMedAssist.init({
        widgetTitle: "Chat Support",
        firstBotMessage: "Hello! How can I help you?",
        onClose: function () {
          console.log("Widget closed");
        },
      });
    </script>
  </body>
</html>
```

### 2. TypeScript Support (Optional but Recommended)

For type safety in TypeScript projects:

1. **Copy `widget-loader.d.ts` to your project** (or reference it)

2. **Add to your `tsconfig.json`**:

```json
{
  "compilerOptions": {
    "types": ["./path/to/widget-loader.d.ts"]
  }
}
```

3. **Use with full type safety**:

```typescript
// TypeScript will now provide autocomplete and type checking
window.EkaMedAssist.initMedAssist({
  widgetTitle: "Chat Support",
  firstBotMessage: "Hello!",
  onClose: () => {
    console.log("Widget closed");
  },
});
```

## API Reference

### `window.EkaMedAssist.initMedAssist(config)`

Initializes and opens the widget with the provided configuration.

#### Parameters

| Parameter          | Type                                                                   | Required | Default          | Description                                        |
| ------------------ | ---------------------------------------------------------------------- | -------- | ---------------- | -------------------------------------------------- |
| `widgetTitle`      | `string`                                                               | No       | -                | Title displayed in the widget header               |
| `firstBotMessage`  | `string`                                                               | No       | -                | First message sent by the bot when widget opens    |
| `firstUserMessage` | `string`                                                               | No       | -                | First message sent by the user (auto-sent on open) |
| `theme`            | `"doctor-light" \| "doctor-dark" \| "patient-light" \| "patient-dark"` | No       | `"doctor-light"` | Theme for the widget                               |
| `onClose`          | `() => void`                                                           | No       | -                | Callback function called when widget is closed     |
| `onMinimize`       | `() => void`                                                           | No       | -                | Callback function called when widget is minimized  |
| `scriptUrl`        | `string`                                                               | No       | CDN URL          | Custom script URL (for self-hosting)               |
| `cssUrl`           | `string`                                                               | No       | CDN URL          | Custom CSS URL (for self-hosting)                  |
| `position`         | `string`                                                               | No       | `"bottom-right"` | Widget position (currently not used)               |

#### Example

```javascript
window.EkaMedAssist.initMedAssist({
  widgetTitle: "Medical Assistant",
  firstBotMessage: "Hi! I'm here to help with your medical questions.",
  firstUserMessage: "Hello",
  theme: "doctor-light",
  onClose: () => {
    console.log("Widget closed");
    // Show a button to reopen, track analytics, etc.
  },
});
```

### `window.EkaMedAssist.closeMedAssist()`

Closes the widget programmatically.

#### Example

```javascript
// Close the widget
window.EkaMedAssist.closeMedAssist();
```

## Usage Examples

### Example 1: Basic Usage

```html
<script src="https://cdn.ekacare.co/apollo/widget-loader.js"></script>
<script>
  window.EkaMedAssist.init({
    widgetTitle: "Chat Support",
    firstBotMessage: "Hello! How can I help?",
    onClose: () => console.log("Widget closed"),
  });
</script>
```

### Example 2: With Custom Callbacks

```javascript
window.EkaMedAssist.initMedAssist({
  widgetTitle: "Support Chat",
  firstBotMessage: "Welcome! How can I assist you?",
  onClose: function () {
    // Show a button to reopen the widget
    showReopenButton();

    // Track analytics
    analytics.track("widget_closed");
  },
});
```

### Example 3: TypeScript with Helper Functions

```typescript
import { initEkaMedAssist, closeEkaMedAssist } from "./widget-loader-example";

// Initialize
initEkaMedAssist({
  widgetTitle: "Chat Support",
  firstBotMessage: "Hello!",
  onClose: () => {
    console.log("Closed");
  },
});

// Close programmatically
closeEkaMedAssist();
```

### Example 4: React Integration

```tsx
import { useEffect } from "react";

function MyApp() {
  useEffect(() => {
    // Load widget-loader.js
    const script = document.createElement("script");
    script.src = "https://cdn.ekacare.co/apollo/widget-loader.js";
    script.onload = () => {
      // Initialize widget after script loads
      window.EkaMedAssist?.init({
        widgetTitle: "Chat Support",
        firstBotMessage: "Hello!",
        onClose: () => {
          console.log("Widget closed");
        },
      });
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      window.EkaMedAssist?.close();
    };
  }, []);

  return <div>My App</div>;
}
```

## How It Works

1. **Load widget-loader.js**: This small script (~5KB) sets up the global `window.EkaMedAssist` API
2. **Call initMedAssist()**: This loads the React bundle (widget.js) and CSS asynchronously
3. **Widget mounts**: Once loaded, the widget is automatically mounted and displayed
4. **Manage lifecycle**: Use `closeMedAssist()` to close, or callbacks to handle events

## Benefits

✅ **Type-safe**: Full TypeScript support with autocomplete  
✅ **Lightweight**: Loader is only ~5KB, main bundle loads on demand  
✅ **Easy to use**: Simple API with sensible defaults  
✅ **Flexible**: Customize theme, messages, and callbacks  
✅ **No dependencies**: Works in any website, no framework required

## Troubleshooting

### Widget doesn't appear

1. Check browser console for errors
2. Verify `widget-loader.js` is loaded: `console.log(window.EkaMedAssist)`
3. Check network tab to ensure `widget.js` and CSS are loading
4. Verify no CSP (Content Security Policy) blocking the scripts

### TypeScript errors

1. Make sure `widget-loader.d.ts` is included in your project
2. Add it to `tsconfig.json` types array
3. Restart your TypeScript server

### Widget already initialized error

If you see this warning, call `closeMedAssist()` first:

```javascript
window.EkaMedAssist.closeMedAssist();
window.EkaMedAssist.initMedAssist({
  /* new config */
});
```
