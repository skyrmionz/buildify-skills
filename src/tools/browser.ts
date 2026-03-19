import { chromium, Browser, Page } from "playwright";

let browser: Browser | null = null;
let page: Page | null = null;

async function ensureBrowser(): Promise<Page> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: false, // Visible so user can watch what the agent does
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    page = await context.newPage();
  }
  if (!page || page.isClosed()) {
    const context = browser.contexts()[0] || (await browser.newContext());
    page = await context.newPage();
  }
  return page;
}

export const browserTools = [
  {
    name: "browser_open",
    description:
      "Open a URL in the browser. Use this to navigate to a Salesforce org page. The browser is visible so the user can watch.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "URL to open" },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_click",
    description:
      "Click an element on the page. Use CSS selectors or text content to identify elements.",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description:
            'CSS selector or text selector (e.g., "text=Save" or "button.primary")',
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "browser_fill",
    description: "Fill a text field with a value",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for the input field",
        },
        value: { type: "string", description: "Value to fill" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "browser_screenshot",
    description:
      "Take a screenshot of the current page. Returns a base64-encoded PNG. Use this to see what's on screen.",
    inputSchema: {
      type: "object" as const,
      properties: {
        fullPage: {
          type: "boolean",
          description: "Capture full page (default: false, captures viewport only)",
        },
      },
    },
  },
  {
    name: "browser_get_text",
    description:
      "Get the text content of an element or the entire page",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description:
            "CSS selector (omit to get full page text, provide to get specific element)",
        },
      },
    },
  },
  {
    name: "browser_select",
    description: "Select an option from a dropdown/select element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for the select element",
        },
        value: { type: "string", description: "Option value or label to select" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "browser_wait",
    description: "Wait for an element to appear on the page",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector to wait for",
        },
        timeout: {
          type: "number",
          description: "Max wait time in ms (default: 10000)",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "browser_execute",
    description:
      "Execute JavaScript in the browser page context. Use for complex interactions or reading page state.",
    inputSchema: {
      type: "object" as const,
      properties: {
        script: {
          type: "string",
          description: "JavaScript code to execute in the page",
        },
      },
      required: ["script"],
    },
  },
  {
    name: "browser_close",
    description: "Close the browser when done with Salesforce org interactions",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

export async function handleBrowser(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "browser_open": {
      const p = await ensureBrowser();
      await p.goto(args.url as string, { waitUntil: "domcontentloaded" });
      const title = await p.title();
      return `Navigated to: ${title} (${p.url()})`;
    }

    case "browser_click": {
      const p = await ensureBrowser();
      const selector = args.selector as string;
      await p.click(selector, { timeout: 10000 });
      // Small wait for any navigation/rendering
      await p.waitForTimeout(500);
      return `Clicked: ${selector}`;
    }

    case "browser_fill": {
      const p = await ensureBrowser();
      await p.fill(args.selector as string, args.value as string);
      return `Filled "${args.selector}" with value`;
    }

    case "browser_screenshot": {
      const p = await ensureBrowser();
      const buffer = await p.screenshot({
        fullPage: (args.fullPage as boolean) || false,
      });
      const base64 = buffer.toString("base64");
      // Return truncated base64 with info about how to view it
      return `Screenshot captured (${buffer.length} bytes). Base64 PNG data:\ndata:image/png;base64,${base64.slice(0, 200)}... [truncated, full image ${base64.length} chars]`;
    }

    case "browser_get_text": {
      const p = await ensureBrowser();
      let text: string;
      if (args.selector) {
        text = await p.textContent(args.selector as string) || "";
      } else {
        text = await p.evaluate(() => document.body.innerText);
      }
      // Truncate if very long
      if (text.length > 5000) {
        text = text.slice(0, 5000) + "\n... [truncated]";
      }
      return text;
    }

    case "browser_select": {
      const p = await ensureBrowser();
      await p.selectOption(args.selector as string, args.value as string);
      return `Selected "${args.value}" in ${args.selector}`;
    }

    case "browser_wait": {
      const p = await ensureBrowser();
      await p.waitForSelector(args.selector as string, {
        timeout: (args.timeout as number) || 10000,
      });
      return `Element found: ${args.selector}`;
    }

    case "browser_execute": {
      const p = await ensureBrowser();
      const result = await p.evaluate(args.script as string);
      return JSON.stringify(result, null, 2);
    }

    case "browser_close": {
      if (browser) {
        await browser.close();
        browser = null;
        page = null;
      }
      return "Browser closed";
    }

    default:
      throw new Error(`Unknown browser tool: ${name}`);
  }
}
