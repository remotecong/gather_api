declare module "@sentry/node" {
  interface SentryScope {
    setTag: (key: string, values: any) => void;
    clear: () => void;
  }
  export function withScope(callback: (scope: SentryScope) => void): void;
  export function configureScope(callback: (scope: SentryScope) => void): void;
  export function captureException(exception: Error): void;
  export function init(options: { dsn: string | undefined }): void;
}

declare module "@dillonchr/domget" {
  interface DomGetOptions {
    url: string;
    headers?: object;
  }

  interface DomGetElement {
    text: string;
    querySelector: (selector: string) => DomGetElement | undefined;
    attributes: DomGetElementAttributes;
    querySelectorAll: (selector: string) => DomGetElement[];
  }

  interface DomGetElementAttributes {
    href?: string;
    "data-title"?: string;
  }

  export default function(
    options: DomGetOptions,
    fn: (error: Error, data: DomGetElement) => void
  ): void;
}
